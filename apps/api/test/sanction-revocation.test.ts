import { afterAll, expect, test } from "bun:test";
import { DUEL_GAME_CONFIG, type Outcome } from "@repo/duel-engine";
import { getLogger } from "@repo/logger";
import type { Standing } from "@repo/ranked-engine";
import { applyEvent, createGame, type GameEvent, getResult } from "@repo/typing-engine";
import { and, eq } from "drizzle-orm";
import { createApp } from "../src/app.ts";
import { sanction, user } from "../src/db/client.ts";
import { saveDuel } from "../src/modules/duel/service.ts";
import { banPlayer, suspendPlayer, voidDuel } from "../src/modules/fair-play/service.ts";
import { readStanding, saveStanding } from "../src/modules/standing/service.ts";
import { createTestAuth, signInPlayer, signInPlayerWithNickname } from "./helpers/auth.ts";
import { createTestDb } from "./helpers/db.ts";
import { createTestRedis } from "./helpers/redis.ts";

const testDb = await createTestDb();
const testRedis = await createTestRedis();
const auth = createTestAuth(testDb.db);
const app = createApp(testDb.db, auth, testRedis.redis, getLogger("api")).listen(0);
const origin = `http://localhost:${app.server?.port}`;

type Identity = { id: string; email: string };

// Stands in for GitHub and Discord: only their HTTP APIs are faked, the whole Better Auth flow runs for real.
let identity: Identity;
const fakeProviders = async (input: string | URL | Request, init?: RequestInit) => {
  const url = input instanceof Request ? input.url : String(input);
  switch (decodeURIComponent(url)) {
    case "https://github.com/login/oauth/access_token":
    case "https://discord.com/api/oauth2/token":
      return Response.json({ access_token: "provider-token", token_type: "bearer" });
    case "https://api.github.com/user":
      return Response.json({ id: Number(identity.id), login: `gh_${identity.id}`, email: null });
    case "https://api.github.com/user/emails":
      return Response.json([{ email: identity.email, primary: true, verified: true }]);
    case "https://discord.com/api/users/@me":
      return Response.json({
        id: identity.id,
        username: `dc_${identity.id}`,
        global_name: null,
        discriminator: "0",
        avatar: null,
        email: identity.email,
        verified: true,
      });
    default:
      return realFetch(input, init);
  }
};
const realFetch = globalThis.fetch;
globalThis.fetch = Object.assign(fakeProviders, { preconnect: realFetch.preconnect });

afterAll(async () => {
  globalThis.fetch = realFetch;
  await app.stop(true);
  await testRedis.drop();
  await testDb.drop();
});

// The administrator is a mark set by hand in the database (ADR 0014).
const signInAdministrator = async () => {
  const signedIn = await signInPlayer(auth);
  await testDb.db
    .update(user)
    .set({ isAdministrator: true })
    .where(eq(user.id, signedIn.player.id));
  return signedIn;
};
const administrator = await signInAdministrator();

const revoke = (sanctionId: string, cookie = administrator.cookie) =>
  fetch(`${origin}/api/admin/sanctions/${sanctionId}/revocation`, {
    method: "POST",
    headers: { cookie },
  });

const listSanctions = (playerId: string, cookie = administrator.cookie) =>
  fetch(`${origin}/api/admin/players/${playerId}/sanctions`, { headers: { cookie } });

const sanctionIdOf = async (playerId: string, kind: "voided_duel" | "suspension" | "ban") => {
  const [found] = await testDb.db
    .select({ id: sanction.id })
    .from(sanction)
    .where(and(eq(sanction.playerId, playerId), eq(sanction.kind, kind)));
  if (!found) throw new Error(`Player ${playerId} has no ${kind}`);
  return found.id;
};

const DAY_MS = 24 * 60 * 60 * 1000;

test("the Sanctions of a Player are listed newest first, each with its kind, cause, start, end and revocation", async () => {
  const { player } = await signInPlayer(auth);
  const suspendedAt = new Date("2026-11-01T12:00:00.000Z");
  const bannedAt = new Date("2026-11-10T12:00:00.000Z");
  await suspendPlayer(testDb.db, {
    playerId: player.id,
    cause: "violation",
    at: suspendedAt,
    lengthMs: 3 * DAY_MS,
  });
  await banPlayer(testDb.db, { playerId: player.id, cause: "review", at: bannedAt });

  const response = await listSanctions(player.id);

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual([
    {
      id: expect.any(String),
      kind: "ban",
      cause: "review",
      startedAt: bannedAt.getTime(),
      endsAt: null,
      revokedAt: null,
    },
    {
      id: expect.any(String),
      kind: "suspension",
      cause: "violation",
      startedAt: suspendedAt.getTime(),
      endsAt: suspendedAt.getTime() + 3 * DAY_MS,
      revokedAt: null,
    },
  ]);
});

test("listing the Sanctions of a Player who does not exist answers PLAYER_NOT_FOUND", async () => {
  const response = await listSanctions("no-such-player");

  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ code: "PLAYER_NOT_FOUND" });
});

test("revoking a Suspension lets the Player into the Queue at once, and the Suspension is kept, marked as revoked", async () => {
  const { player, cookie } = await signInPlayerWithNickname(auth, origin);
  await suspendPlayer(testDb.db, {
    playerId: player.id,
    cause: "review",
    at: new Date(Date.now() - DAY_MS),
    lengthMs: 14 * DAY_MS,
  });
  const queue = () => fetch(`${origin}/api/queue`, { headers: { cookie } });
  expect((await queue()).status).toBe(403);

  const response = await revoke(await sanctionIdOf(player.id, "suspension"));

  expect(response.status).toBe(204);
  expect((await queue()).status).toBe(200);
  const [kept] = (await (await listSanctions(player.id)).json()) as { revokedAt: number | null }[];
  expect(kept?.revokedAt).toEqual(expect.any(Number));
});

const cookieHeader = (response: Response) =>
  response.headers
    .getSetCookie()
    .map((cookie) => cookie.slice(0, cookie.indexOf(";")))
    .join("; ");

// Plays the browser's part: start the sign-in, come back from the provider with a code.
const signInWith = async (provider: "github" | "discord", as: Identity) => {
  identity = as;
  const start = await fetch(`${origin}/api/auth/sign-in/social`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ provider, callbackURL: "/", errorCallbackURL: "/sign-in" }),
  });
  const { url } = (await start.json()) as { url: string };
  const state = new URL(url).searchParams.get("state");
  const callback = await fetch(
    `${origin}/api/auth/callback/${provider}?code=provider-code&state=${state}`,
    { headers: { cookie: cookieHeader(start) }, redirect: "manual" },
  );
  return {
    redirect: new URL(callback.headers.get("location") ?? "", origin),
    cookie: cookieHeader(callback),
  };
};

const playerIdOf = async (cookie: string) => {
  const response = await fetch(`${origin}/api/auth/get-session`, { headers: { cookie } });
  const found = (await response.json()) as { user: { id: string } } | null;
  if (!found) throw new Error("The sign-in opened no session");
  return found.user.id;
};

const uniqueId = () => String(Math.floor(Math.random() * 1e12));

test("revoking a Ban lets the Player sign in again with the same GitHub and Discord accounts and e-mail, and puts them back on the Leaderboard", async () => {
  const email = `${crypto.randomUUID()}@example.com`;
  const github = { id: uniqueId(), email };
  const discord = { id: uniqueId(), email };
  const { cookie } = await signInWith("github", github);
  await signInWith("discord", discord);
  const playerId = await playerIdOf(cookie);
  const nickname = `b_${uniqueId()}`;
  await testDb.db.update(user).set({ nickname }).where(eq(user.id, playerId));
  await saveStanding(testDb.db, playerId, {
    mmr: 1500,
    duelsPlayed: 30,
    rank: { tier: "gold", division: 2, lp: 40 },
  });
  await banPlayer(testDb.db, { playerId, cause: "review", at: new Date() });
  expect((await signInWith("github", github)).redirect.searchParams.get("error")).toBe("BANNED");

  const response = await revoke(await sanctionIdOf(playerId, "ban"));

  expect(response.status).toBe(204);
  for (const [provider, as] of [
    ["github", github],
    ["discord", discord],
  ] as const) {
    const signIn = await signInWith(provider, as);
    expect(signIn.redirect.pathname).toBe("/");
    expect(await playerIdOf(signIn.cookie)).toBe(playerId);
  }
  const leaderboard = (await (await fetch(`${origin}/api/leaderboard`)).json()) as {
    podium: { nickname: string }[];
  };
  expect(leaderboard.podium.map((listed) => listed.nickname)).toContain(nickname);
});

// Past Placement at Gold III, 50 LP, with an MMR of 1384: a Duel between two such Players moves the
// winner by +16 MMR and +30 LP and the loser by −16 MMR and −17 LP.
const even: Standing = { mmr: 1384, duelsPlayed: 40, rank: { tier: "gold", division: 3, lp: 50 } };
const words = ["cat", "dog", "owl"];
const journal: GameEvent[] = [
  { type: "start", at: 0 },
  { type: "tick", at: 30_000 },
];
const result = getResult(journal.reduce(applyEvent, createGame(DUEL_GAME_CONFIG, words)));

// A ranked Duel between two Players at even Standings, saved as the API saves one, ended at `endedAt`.
const playRankedDuel = async (outcomes: readonly [Outcome, Outcome], endedAt: number) => {
  const [first, second] = [await signInPlayer(auth), await signInPlayer(auth)];
  await saveStanding(testDb.db, first.player.id, even);
  await saveStanding(testDb.db, second.player.id, even);
  const duelId = crypto.randomUUID();
  await saveDuel(testDb.db, duelId, {
    kind: "ranked",
    playerIds: [first.player.id, second.player.id],
    outcomes,
    rounds: [
      {
        number: 1,
        words,
        startAt: endedAt - 30_000,
        endedAt,
        journals: [journal, journal],
        results: [result, result],
        multipliers: [1, 1],
        outcomes,
      },
    ],
  });
  return { duelId, cheater: first.player.id, victim: second.player.id };
};

const afterDuel = { ...even, duelsPlayed: 41 };

test("revoking a Voided Duel restores both Standings as the Duel left them, once", async () => {
  const { duelId, cheater, victim } = await playRankedDuel(["win", "loss"], Date.now() - DAY_MS);
  const [cheaterPlayed, victimPlayed] = [
    await readStanding(testDb.db, cheater),
    await readStanding(testDb.db, victim),
  ];
  await voidDuel(testDb.db, { duelId, playerId: cheater, cause: "review", at: new Date() });
  expect(await readStanding(testDb.db, victim)).toEqual(afterDuel);
  const sanctionId = await sanctionIdOf(cheater, "voided_duel");

  const [first, second] = await Promise.all([revoke(sanctionId), revoke(sanctionId)]);

  expect([first?.status, second?.status].toSorted((a = 0, b = 0) => a - b)).toEqual([204, 409]);
  expect(await readStanding(testDb.db, cheater)).toEqual(cheaterPlayed);
  expect(await readStanding(testDb.db, victim)).toEqual(victimPlayed);
  const again = await revoke(sanctionId);
  expect(again.status).toBe(409);
  expect(await again.json()).toEqual({ code: "SANCTION_ALREADY_REVOKED" });
  expect(await readStanding(testDb.db, victim)).toEqual(victimPlayed);
});

test("revoking a Suspension restores the Standings of the Duels it voided", async () => {
  const { cheater, victim } = await playRankedDuel(["win", "loss"], Date.now() - DAY_MS);
  const victimPlayed = await readStanding(testDb.db, victim);
  await suspendPlayer(testDb.db, {
    playerId: cheater,
    cause: "review",
    at: new Date(),
    lengthMs: 3 * DAY_MS,
  });
  expect(await readStanding(testDb.db, victim)).toEqual(afterDuel);

  await revoke(await sanctionIdOf(cheater, "suspension"));

  expect(await readStanding(testDb.db, victim)).toEqual(victimPlayed);
});

test("a Duel whose voiding was revoked counts again, and can be voided by a later Sanction", async () => {
  const { duelId, cheater, victim } = await playRankedDuel(["win", "loss"], Date.now() - DAY_MS);
  await voidDuel(testDb.db, { duelId, playerId: cheater, cause: "review", at: new Date() });
  await revoke(await sanctionIdOf(cheater, "voided_duel"));

  expect(
    await voidDuel(testDb.db, { duelId, playerId: cheater, cause: "review", at: new Date() }),
  ).toBe("voided");
  expect(await readStanding(testDb.db, victim)).toEqual(afterDuel);
});

test("revoking a Sanction that does not exist answers SANCTION_NOT_FOUND", async () => {
  const response = await revoke(crypto.randomUUID());

  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ code: "SANCTION_NOT_FOUND" });
});

test("listing and revoking Sanctions are refused with FORBIDDEN to a Guest and to a Player who is not the administrator, and revoke nothing", async () => {
  const { player, cookie } = await signInPlayer(auth);
  await banPlayer(testDb.db, { playerId: player.id, cause: "review", at: new Date() });
  const sanctionId = await sanctionIdOf(player.id, "ban");
  const someone = await signInPlayer(auth);

  for (const as of ["", cookie, someone.cookie])
    for (const response of [await listSanctions(player.id, as), await revoke(sanctionId, as)]) {
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ code: "FORBIDDEN" });
    }
  const [kept] = await testDb.db
    .select({ revokedAt: sanction.revokedAt })
    .from(sanction)
    .where(eq(sanction.id, sanctionId));
  expect(kept?.revokedAt).toBeNull();
});
