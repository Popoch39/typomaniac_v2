import { afterAll, expect, test } from "bun:test";
import type { QueueServerMessage } from "@repo/matchmaking-engine";
import { getLogger } from "@repo/logger";
import { eq } from "drizzle-orm";
import { DUEL_GAME_CONFIG, type Outcome } from "@repo/duel-engine";
import { FIRST_SUSPENSION_MS, REPAIR_WINDOW_MS } from "@repo/fair-play-engine";
import type { Standing } from "@repo/ranked-engine";
import { applyEvent, createGame, type GameEvent, getResult } from "@repo/typing-engine";
import { createApp } from "../src/app.ts";
import { sanction, voidedDuel } from "../src/db/client.ts";
import { saveDuel } from "../src/modules/duel/service.ts";
import { requireFairPlayConfig } from "../src/modules/fair-play/config.ts";
import { suspendPlayer } from "../src/modules/fair-play/service.ts";
import { readStanding, saveStanding } from "../src/modules/standing/service.ts";
import { createTestAuth, signInPlayer, signInPlayerWithNickname } from "./helpers/auth.ts";
import { createTestDb } from "./helpers/db.ts";
import { createTestRedis } from "./helpers/redis.ts";
import { openSocket, openSocketOf, requestUpgrade } from "./helpers/socket.ts";

const testDb = await createTestDb();
const testRedis = await createTestRedis();
const auth = createTestAuth(testDb.db);
const APPEAL_ADDRESS = "appeal@typomaniac.test";
const app = createApp(testDb.db, auth, testRedis.redis, getLogger("api"), {
  fairPlay: { appealAddress: APPEAL_ADDRESS },
}).listen(0);
const origin = `http://localhost:${app.server?.port}`;
afterAll(async () => {
  await app.stop(true);
  await testRedis.drop();
  await testDb.drop();
});

const queueSocketUrl = `${origin.replace(/^http/, "ws")}/api/queue/socket`;
const readQueue = (cookie: string) => fetch(`${origin}/api/queue`, { headers: { cookie } });

// A Player with a Nickname, suspended from `at` for a first Suspension.
const signInSuspended = async (at: Date) => {
  const signedIn = await signInPlayerWithNickname(auth, origin);
  await suspendPlayer(testDb.db, {
    playerId: signedIn.player.id,
    cause: "violation",
    at,
    lengthMs: FIRST_SUSPENSION_MS,
  });
  return { ...signedIn, endsAt: at.getTime() + FIRST_SUSPENSION_MS };
};

const SUSPENDED_AT = new Date("2026-11-20T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

// Past Placement at Gold III, 50 LP, with an MMR of 1384: a Duel between two such Players moves the
// winner by +16 MMR and +30 LP and the loser by −16 MMR and −17 LP.
const even: Standing = { mmr: 1384, duelsPlayed: 40, rank: { tier: "gold", division: 3, lp: 50 } };

const words = ["cat", "dog", "owl"];
const journal: GameEvent[] = [
  { type: "start", at: 0 },
  { type: "tick", at: 30_000 },
];
const result = getResult(journal.reduce(applyEvent, createGame(DUEL_GAME_CONFIG, words)));

const signInRanked = async () => {
  const { player } = await signInPlayer(auth);
  await saveStanding(testDb.db, player.id, even);
  return player.id;
};

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

const voidedDuelIds = async () =>
  (await testDb.db.select({ duelId: voidedDuel.duelId }).from(voidedDuel)).map((row) => row.duelId);

test("suspending a Player voids the ranked Duels they won in the 14 days before, and no older one", async () => {
  const cheater = await signInRanked();
  const [recentVictim, oldVictim, winner] = [
    await signInRanked(),
    await signInRanked(),
    await signInRanked(),
  ];
  const older = await playRankedDuel(
    [oldVictim, cheater],
    ["loss", "win"],
    new Date(SUSPENDED_AT.getTime() - REPAIR_WINDOW_MS - DAY_MS),
  );
  const recent = await playRankedDuel(
    [cheater, recentVictim],
    ["win", "loss"],
    new Date(SUSPENDED_AT.getTime() - 3 * DAY_MS),
  );
  const lost = await playRankedDuel(
    [cheater, winner],
    ["loss", "win"],
    new Date(SUSPENDED_AT.getTime() - DAY_MS),
  );

  const suspended = await suspendPlayer(testDb.db, {
    playerId: cheater,
    cause: "violation",
    at: SUSPENDED_AT,
    lengthMs: FIRST_SUSPENSION_MS,
  });

  expect(suspended).toBe("suspended");
  const voided = await voidedDuelIds();
  expect(voided).toContain(recent);
  expect(voided).not.toContain(older);
  expect(voided).not.toContain(lost);
  // The recent victim gets back what they lost; the old one keeps their −16 MMR and −17 LP.
  expect(await readStanding(testDb.db, recentVictim)).toEqual({
    mmr: 1384,
    duelsPlayed: 41,
    rank: { tier: "gold", division: 3, lp: 50 },
  });
  expect(await readStanding(testDb.db, oldVictim)).toEqual({
    mmr: 1368,
    duelsPlayed: 41,
    rank: { tier: "gold", division: 3, lp: 33 },
  });
  // One Suspension, from the instant given to its end; the voided Duel is withdrawn under it.
  const sanctions = await testDb.db.select().from(sanction).where(eq(sanction.playerId, cheater));
  expect(sanctions).toEqual([
    {
      id: expect.any(String),
      playerId: cheater,
      kind: "suspension",
      cause: "violation",
      startedAt: SUSPENDED_AT,
      endsAt: new Date(SUSPENDED_AT.getTime() + FIRST_SUSPENSION_MS),
      revokedAt: null,
    },
  ]);
  const [withdrawn] = await testDb.db
    .select({ sanctionId: voidedDuel.sanctionId })
    .from(voidedDuel)
    .where(eq(voidedDuel.duelId, recent));
  expect(withdrawn?.sanctionId).toBe(sanctions[0]?.id);
});

test("suspending a Player again at the same instant saves no second Suspension and repairs nobody twice", async () => {
  const cheater = await signInRanked();
  const victim = await signInRanked();
  await playRankedDuel(
    [cheater, victim],
    ["win", "loss"],
    new Date(SUSPENDED_AT.getTime() - DAY_MS),
  );
  const suspension = {
    playerId: cheater,
    cause: "review",
    at: SUSPENDED_AT,
    lengthMs: FIRST_SUSPENSION_MS,
  } as const;

  const outcomes = await Promise.all([
    suspendPlayer(testDb.db, suspension),
    suspendPlayer(testDb.db, suspension),
  ]);

  expect(outcomes.toSorted()).toEqual(["already-suspended", "suspended"]);
  expect(
    await testDb.db.select().from(sanction).where(eq(sanction.playerId, cheater)),
  ).toHaveLength(1);
  expect(await readStanding(testDb.db, victim)).toEqual({
    mmr: 1384,
    duelsPlayed: 41,
    rank: { tier: "gold", division: 3, lp: 50 },
  });
});

test("the Queue refuses a suspended Player with the end of their Suspension, over the socket and over HTTP", async () => {
  const { cookie, endsAt } = await signInSuspended(new Date());

  const refused = await requestUpgrade(queueSocketUrl, cookie);
  expect(refused.status).toBe(403);
  expect(await refused.json()).toEqual({ code: "RANKED_SUSPENDED", endsAt });
  const reason = await readQueue(cookie);
  expect(reason.status).toBe(403);
  expect(await reason.json()).toEqual({ code: "RANKED_SUSPENDED", endsAt });
});

test("a suspended Player enters the Queue once their Suspension has ended, without any action", async () => {
  // A Suspension that ends a moment from now.
  const { cookie, endsAt } = await signInSuspended(
    new Date(Date.now() - FIRST_SUSPENSION_MS + 300),
  );
  expect((await requestUpgrade(queueSocketUrl, cookie)).status).toBe(403);

  await Bun.sleep(endsAt - Date.now() + 50);

  expect(await (await readQueue(cookie)).json()).toEqual({ queuedAt: null });
  const socket = await openSocketOf<QueueServerMessage, never>(queueSocketUrl, cookie);
  expect(await socket.next()).toMatchObject({ type: "queued" });
  socket.close();
});

test("a suspended Player still signs in, creates a Custom Duel and joins one", async () => {
  const suspended = await signInSuspended(new Date());
  const creator = await signInPlayerWithNickname(auth, origin);

  const me = await fetch(`${origin}/api/me`, { headers: { cookie: suspended.cookie } });
  expect(me.status).toBe(200);
  const created = await fetch(`${origin}/api/duels`, {
    method: "POST",
    headers: { cookie: suspended.cookie },
  });
  expect(created.status).toBe(201);
  const { id } = (await (
    await fetch(`${origin}/api/duels`, { method: "POST", headers: { cookie: creator.cookie } })
  ).json()) as { id: string };
  const duelSocketUrl = `${origin.replace(/^http/, "ws")}/api/duels/${id}/socket`;
  const host = await openSocket(duelSocketUrl, creator.cookie);
  await host.next();
  const joined = await openSocket(duelSocketUrl, suspended.cookie);
  expect(await joined.next()).toMatchObject({ type: "state", seat: 1 });
  host.close();
  joined.close();
});

const readFairPlay = (cookie: string) =>
  fetch(`${origin}/api/me/fair-play`, { headers: { cookie } });

test("a suspended Player reads the end of their Suspension and the appeal address, and nothing about why", async () => {
  const { cookie, endsAt } = await signInSuspended(new Date());

  const response = await readFairPlay(cookie);

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    voidedDuels: [],
    suspension: { endsAt, appealAddress: APPEAL_ADDRESS },
  });
});

test("a Player whose Suspension has ended, or was revoked, or who was never suspended reads none", async () => {
  const ended = await signInSuspended(new Date(Date.now() - FIRST_SUSPENSION_MS - 1));
  const revoked = await signInSuspended(new Date());
  await testDb.db
    .update(sanction)
    .set({ revokedAt: new Date() })
    .where(eq(sanction.playerId, revoked.player.id));
  const neverSuspended = await signInPlayerWithNickname(auth, origin);

  for (const { cookie } of [ended, revoked, neverSuspended])
    expect(await (await readFairPlay(cookie)).json()).toEqual({
      voidedDuels: [],
      suspension: null,
    });
  expect((await requestUpgrade(queueSocketUrl, revoked.cookie)).status).not.toBe(403);
});

test("the appeal address is read from the configuration, which the API cannot start without", () => {
  expect(requireFairPlayConfig({ FAIR_PLAY_APPEAL_ADDRESS: "appeal@example.org" })).toEqual({
    appealAddress: "appeal@example.org",
  });
  expect(() => requireFairPlayConfig({})).toThrow("FAIR_PLAY_APPEAL_ADDRESS is not set");
});

const call = (method: string, path: string, cookie: string, body?: unknown) =>
  fetch(`${origin}${path}`, {
    method,
    headers: { cookie, ...(body === undefined ? {} : { "content-type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

type PlayerMessage = { type: string; challengeId?: string };
type PlayerClientMessage = { type: "challenge"; playerId: string };

// A Player tab that hands over the next message of a type, skipping the others.
const openPlayerTab = async (cookie: string) => {
  const socket = await openSocketOf<PlayerMessage, PlayerClientMessage>(
    `${origin.replace(/^http/, "ws")}/api/online/socket`,
    cookie,
  );
  const nextOf = async (type: string) => {
    for (;;) {
      const message = await socket.next();
      if (message.type === type) return message;
    }
  };
  return { ...socket, nextOf };
};

test("a suspended Player still sends a Friend request, challenges a Friend and is challenged", async () => {
  const suspended = await signInSuspended(new Date());
  const friend = await signInPlayerWithNickname(auth, origin);

  const sent = await call("POST", "/api/friends/requests", suspended.cookie, {
    playerId: friend.player.id,
  });
  expect(sent.status).toBe(200);
  expect(await sent.json()).toEqual({ result: "sent" });
  const accepted = await call(
    "POST",
    `/api/friends/requests/${suspended.player.id}/accept`,
    friend.cookie,
  );
  expect(accepted.status).toBe(204);
  const [suspendedTab, friendTab] = [
    await openPlayerTab(suspended.cookie),
    await openPlayerTab(friend.cookie),
  ];

  suspendedTab.send({ type: "challenge", playerId: friend.player.id });
  const challenging = await suspendedTab.nextOf("challengeSent");
  expect((await friendTab.nextOf("challengeReceived")).challengeId).toBe(challenging.challengeId);
  friendTab.send({ type: "challenge", playerId: suspended.player.id });
  const challenged = await friendTab.nextOf("challengeSent");
  expect((await suspendedTab.nextOf("challengeReceived")).challengeId).toBe(challenged.challengeId);
  suspendedTab.close();
  friendTab.close();
});
