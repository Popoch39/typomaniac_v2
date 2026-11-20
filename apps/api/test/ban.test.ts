import { afterAll, expect, test } from "bun:test";
import { DUEL_GAME_CONFIG, type Outcome } from "@repo/duel-engine";
import { REPAIR_WINDOW_MS } from "@repo/fair-play-engine";
import { getLogger } from "@repo/logger";
import type { Standing } from "@repo/ranked-engine";
import { applyEvent, createGame, type GameEvent, getResult } from "@repo/typing-engine";
import { count, eq } from "drizzle-orm";
import { createApp } from "../src/app.ts";
import { account, sanction, user, voidedDuel } from "../src/db/client.ts";
import { saveDuel } from "../src/modules/duel/service.ts";
import { banPlayer } from "../src/modules/fair-play/service.ts";
import { readStanding, saveStanding } from "../src/modules/standing/service.ts";
import { createTestAuth, signInPlayerWithNickname, TEST_APPEAL_ADDRESS } from "./helpers/auth.ts";
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

const BANNED_AT = new Date("2026-11-20T12:00:00.000Z");

const ban = (playerId: string) =>
  banPlayer(testDb.db, { playerId, cause: "review", at: BANNED_AT });

test("banning a Player ends their sessions: their next request is that of a Guest", async () => {
  const { player, cookie } = await signInPlayerWithNickname(auth, origin);
  expect((await fetch(`${origin}/api/me`, { headers: { cookie } })).status).toBe(200);

  expect(await ban(player.id)).toBe("banned");

  expect((await fetch(`${origin}/api/me`, { headers: { cookie } })).status).toBe(401);
});

const cookieHeader = (response: Response) =>
  response.headers
    .getSetCookie()
    .map((cookie) => cookie.slice(0, cookie.indexOf(";")))
    .join("; ");

// Plays the browser's part: start the sign-in, come back from the provider with a code.
const signInWith = async (provider: "github" | "discord", as: Identity) => {
  identity = as;
  const start = await app.handle(
    new Request("http://localhost/api/auth/sign-in/social", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider, callbackURL: "/", errorCallbackURL: "/sign-in" }),
    }),
  );
  const { url } = (await start.json()) as { url: string };
  const state = new URL(url).searchParams.get("state");
  const callback = await app.handle(
    new Request(
      `http://localhost/api/auth/callback/${provider}?code=provider-code&state=${state}`,
      { headers: { cookie: cookieHeader(start) } },
    ),
  );
  return {
    redirect: new URL(callback.headers.get("location") ?? "", "http://localhost"),
    cookie: cookieHeader(callback),
  };
};

const playerIdOf = async (cookie: string) => {
  const response = await app.handle(
    new Request("http://localhost/api/auth/get-session", { headers: { cookie } }),
  );
  const found = (await response.json()) as { user: { id: string } } | null;
  if (!found) throw new Error("The sign-in opened no session");
  return found.user.id;
};

const uniqueEmail = () => `${crypto.randomUUID()}@example.com`;
const uniqueId = () => String(Math.floor(Math.random() * 1e12));

const countRows = async () => {
  const [players] = await testDb.db.select({ total: count() }).from(user);
  const [accounts] = await testDb.db.select({ total: count() }).from(account);
  return { players: players?.total, accounts: accounts?.total };
};

const expectRefusedAsBanned = (signIn: Awaited<ReturnType<typeof signInWith>>) => {
  expect(signIn.redirect.pathname).toBe("/sign-in");
  expect(signIn.redirect.searchParams.get("error")).toBe("BANNED");
  expect(signIn.redirect.searchParams.get("error_description")).toBe(TEST_APPEAL_ADDRESS);
  expect(signIn.cookie).not.toContain("session_token=");
};

test("a banned Player signing in again with their GitHub or Discord account is refused as banned, with the appeal address", async () => {
  const email = uniqueEmail();
  const github = { id: uniqueId(), email };
  const discord = { id: uniqueId(), email };
  const { cookie } = await signInWith("github", github);
  await signInWith("discord", discord);
  await ban(await playerIdOf(cookie));

  expectRefusedAsBanned(await signInWith("github", github));
  // The Discord account is refused for itself, even under an address the Ban never saw.
  expectRefusedAsBanned(await signInWith("discord", { ...discord, email: uniqueEmail() }));
});

test("a banned e-mail is refused on a new provider account, whatever its case, and no Player nor account is created", async () => {
  const email = uniqueEmail();
  const { cookie } = await signInWith("github", { id: uniqueId(), email });
  await ban(await playerIdOf(cookie));
  const before = await countRows();

  expectRefusedAsBanned(
    await signInWith("discord", { id: uniqueId(), email: email.toUpperCase() }),
  );

  expect(await countRows()).toEqual(before);
});

test("anyone else still signs in", async () => {
  const signIn = await signInWith("github", { id: uniqueId(), email: uniqueEmail() });

  expect(signIn.redirect.pathname).toBe("/");
});

test("a banned Player leaves the Leaderboard and the Positions after theirs close up", async () => {
  const gold = (lp: number) =>
    ({ mmr: 1500, duelsPlayed: 30, rank: { tier: "gold", division: 2, lp } }) as const;
  const [first, second, third] = [
    await signInPlayerWithNickname(auth, origin),
    await signInPlayerWithNickname(auth, origin),
    await signInPlayerWithNickname(auth, origin),
  ];
  await saveStanding(testDb.db, first.player.id, gold(90));
  await saveStanding(testDb.db, second.player.id, gold(50));
  await saveStanding(testDb.db, third.player.id, gold(10));

  await ban(first.player.id);

  const response = await fetch(`${origin}/api/leaderboard`, { headers: { cookie: third.cookie } });
  const body = (await response.json()) as {
    podium: { position: number; nickname: string }[];
    total: number;
    own: { position: number } | null;
  };
  expect(body.podium.map(({ position, nickname }) => [position, nickname])).toEqual([
    [1, second.nickname],
    [2, third.nickname],
  ]);
  expect(body.total).toBe(2);
  expect(body.own?.position).toBe(2);
});

test("the Nickname of a banned Player stays taken", async () => {
  const banned = await signInPlayerWithNickname(auth, origin);
  await ban(banned.player.id);
  const { cookie } = await signInPlayerWithNickname(auth, origin);

  const response = await fetch(`${origin}/api/me/nickname`, {
    method: "PUT",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ nickname: banned.nickname.toUpperCase() }),
  });

  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({ code: "NICKNAME_TAKEN" });
});

// Past Placement at Gold III, 50 LP, with an MMR of 1384: a Duel between two such Players moves the
// winner by +16 MMR and +30 LP and the loser by −16 MMR and −17 LP.
const even: Standing = { mmr: 1384, duelsPlayed: 40, rank: { tier: "gold", division: 3, lp: 50 } };
const DAY_MS = 24 * 60 * 60 * 1000;
const words = ["cat", "dog", "owl"];
const journal: GameEvent[] = [
  { type: "start", at: 0 },
  { type: "tick", at: 30_000 },
];
const result = getResult(journal.reduce(applyEvent, createGame(DUEL_GAME_CONFIG, words)));

// A ranked Duel saved as the API saves one, ended at the given instant.
const playRankedDuel = async (
  playerIds: readonly [string, string],
  outcomes: readonly [Outcome, Outcome],
  endedAt: Date,
) => {
  const duelId = crypto.randomUUID();
  await saveDuel(testDb.db, duelId, {
    kind: "ranked",
    playerIds,
    outcomes,
    rounds: [
      {
        number: 1,
        words,
        startAt: endedAt.getTime() - 30_000,
        endedAt: endedAt.getTime(),
        journals: [journal, journal],
        results: [result, result],
        multipliers: [1, 1],
        outcomes,
      },
    ],
  });
  return duelId;
};

const signInRanked = async () => {
  const signedIn = await signInPlayerWithNickname(auth, origin);
  await saveStanding(testDb.db, signedIn.player.id, even);
  return signedIn;
};

test("banning a Player voids the ranked Duels they won in the 14 days before, and no older one", async () => {
  const [cheater, recentVictim, oldVictim] = [
    await signInRanked(),
    await signInRanked(),
    await signInRanked(),
  ];
  const older = await playRankedDuel(
    [oldVictim.player.id, cheater.player.id],
    ["loss", "win"],
    new Date(BANNED_AT.getTime() - REPAIR_WINDOW_MS - DAY_MS),
  );
  const recent = await playRankedDuel(
    [cheater.player.id, recentVictim.player.id],
    ["win", "loss"],
    new Date(BANNED_AT.getTime() - 3 * DAY_MS),
  );

  await ban(cheater.player.id);

  const voided = (await testDb.db.select({ duelId: voidedDuel.duelId }).from(voidedDuel)).map(
    (row) => row.duelId,
  );
  expect(voided).toContain(recent);
  expect(voided).not.toContain(older);
  // The recent victim gets back what they lost; the old one keeps their −16 MMR and −17 LP.
  expect(await readStanding(testDb.db, recentVictim.player.id)).toEqual({
    ...even,
    duelsPlayed: 41,
  });
  expect(await readStanding(testDb.db, oldVictim.player.id)).toEqual({
    mmr: 1368,
    duelsPlayed: 41,
    rank: { tier: "gold", division: 3, lp: 33 },
  });
});

test("a past Opponent of a banned Player sees them marked as banned", async () => {
  const [cheater, victim] = [await signInRanked(), await signInRanked()];
  const recently = new Date(BANNED_AT.getTime() - DAY_MS);
  await playRankedDuel([cheater.player.id, victim.player.id], ["win", "loss"], recently);
  await ban(cheater.player.id);

  const response = await fetch(`${origin}/api/me/fair-play`, {
    headers: { cookie: victim.cookie },
  });

  expect(await response.json()).toMatchObject({
    voidedDuels: [{ opponentNickname: cheater.nickname, opponentBanned: true, lp: 17 }],
  });
});

test("banning a Player again, even at once, saves no second Ban and repairs nobody twice", async () => {
  const [cheater, victim] = [await signInRanked(), await signInRanked()];
  await playRankedDuel(
    [cheater.player.id, victim.player.id],
    ["win", "loss"],
    new Date(BANNED_AT.getTime() - DAY_MS),
  );

  const outcomes = await Promise.all([ban(cheater.player.id), ban(cheater.player.id)]);

  expect(outcomes.toSorted()).toEqual(["already-banned", "banned"]);
  expect(
    await testDb.db.select().from(sanction).where(eq(sanction.playerId, cheater.player.id)),
  ).toHaveLength(1);
  expect(await readStanding(testDb.db, victim.player.id)).toEqual({ ...even, duelsPlayed: 41 });
});
