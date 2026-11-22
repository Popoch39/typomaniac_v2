import { afterAll, beforeEach, expect, test } from "bun:test";
import { getLogger } from "@repo/logger";
import { eq, sql } from "drizzle-orm";
import type { GameSignals } from "@repo/fair-play-engine";
import { gameAnalysis, review, sanction, suspicion, user, violation } from "../src/db/client.ts";
import { saveDuel } from "../src/modules/duel/service.ts";
import { saveStanding } from "../src/modules/standing/service.ts";
import { createApp } from "../src/app.ts";
import { createTestAuth, signInPlayer } from "./helpers/auth.ts";
import { createTestDb } from "./helpers/db.ts";
import { machineJournal, personJournal, resultOf, targetWords } from "./helpers/journal.ts";
import { createTestRedis } from "./helpers/redis.ts";

const testDb = await createTestDb();
const testRedis = await createTestRedis();
afterAll(async () => {
  await testRedis.drop();
  await testDb.drop();
});
const auth = createTestAuth(testDb.db);
const app = createApp(testDb.db, auth, testRedis.redis, getLogger("api"));

beforeEach(async () => {
  await testDb.db.execute(sql`truncate "user" cascade`);
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

const get = (path: string, cookie?: string) =>
  app.handle(new Request(`http://localhost${path}`, { headers: cookie ? { cookie } : {} }));

const ADMINISTRATION_ROUTES = ["/api/admin/reviews", `/api/admin/reviews/${crypto.randomUUID()}`];

test("every administration route answers FORBIDDEN to a Guest and to a Player who is not the administrator", async () => {
  const { cookie } = await signInPlayer(auth);
  for (const path of ADMINISTRATION_ROUTES)
    for (const response of [await get(path), await get(path, cookie)]) {
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ code: "FORBIDDEN" });
    }
});

test("the administrator is let through", async () => {
  const { cookie } = await signInAdministrator();
  const response = await get("/api/admin/reviews", cookie);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual([]);
});

// A Player with a Nickname, under an open Review, with the Suspicion the fair-play pass left them.
const underReview = async (
  nickname: string,
  {
    reason,
    openedAt,
    value,
  }: { reason: "suspicion" | "master" | "podium"; openedAt: number; value: number | null },
) => {
  const { player } = await signInPlayer(auth);
  await testDb.db.update(user).set({ nickname }).where(eq(user.id, player.id));
  if (value !== null)
    await testDb.db
      .insert(suspicion)
      .values({ playerId: player.id, value, computedAt: new Date(openedAt) });
  const [opened] = await testDb.db
    .insert(review)
    .values({ playerId: player.id, reason, openedAt: new Date(openedAt) })
    .returning({ id: review.id });
  return { playerId: player.id, reviewId: opened?.id };
};

test("the open Reviews are listed highest Suspicion first, with their reason and opened instant, and a settled Review is not listed", async () => {
  const { cookie } = await signInAdministrator();
  const mild = await underReview("mild", { reason: "suspicion", openedAt: 1000, value: 0.61 });
  const master = await underReview("master", { reason: "master", openedAt: 2000, value: null });
  const worst = await underReview("worst", { reason: "suspicion", openedAt: 3000, value: 0.92 });
  const settled = await underReview("settled", { reason: "suspicion", openedAt: 500, value: 0.99 });
  await testDb.db
    .update(review)
    .set({ settledAt: new Date(4000), decision: "cleared" })
    .where(eq(review.playerId, settled.playerId));

  const response = await get("/api/admin/reviews", cookie);

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual([
    {
      id: worst.reviewId,
      playerId: worst.playerId,
      nickname: "worst",
      reason: "suspicion",
      openedAt: 3000,
      suspicion: 0.92,
    },
    {
      id: mild.reviewId,
      playerId: mild.playerId,
      nickname: "mild",
      reason: "suspicion",
      openedAt: 1000,
      suspicion: 0.61,
    },
    {
      id: master.reviewId,
      playerId: master.playerId,
      nickname: "master",
      reason: "master",
      openedAt: 2000,
      suspicion: null,
    },
  ]);
});

const ROUND_MS = 30_000;

// Saves a one-Round ranked Duel the first Player won, ended at `endedAt`.
const saveRankedWin = async (playerIds: readonly [string, string], endedAt: number) => {
  const duelId = crypto.randomUUID();
  const journals = [machineJournal(), personJournal(0)] as const;
  await saveDuel(testDb.db, duelId, {
    kind: "ranked",
    playerIds,
    outcomes: ["win", "loss"],
    rounds: [
      {
        number: 1,
        words: [...targetWords],
        startAt: endedAt - ROUND_MS,
        endedAt,
        journals: [...journals],
        results: [resultOf(journals[0]), resultOf(journals[1])],
        multipliers: [1, 1],
        outcomes: ["win", "loss"],
      },
    ],
  });
  return duelId;
};

const signals: GameSignals = {
  keyPressEvenness: 0.9,
  holdEvenness: 0.8,
  missingRollover: 0.7,
  flatWordSpeed: 0.25,
  superhumanSpeed: 0,
  browserHints: 1,
};

test("a Review shows the Player's Standing, recent ranked Duels with their Outcomes, the signals of each Game, the Violations and the Sanctions", async () => {
  const { cookie } = await signInAdministrator();
  const suspect = await underReview("suspect", { reason: "suspicion", openedAt: 5000, value: 0.8 });
  const { player: opponent } = await signInPlayer(auth);
  await testDb.db.update(user).set({ nickname: "opponent" }).where(eq(user.id, opponent.id));
  const gold = { mmr: 1384, duelsPlayed: 40, rank: { tier: "gold", division: 3, lp: 50 } } as const;
  await saveStanding(testDb.db, suspect.playerId, gold);
  await saveStanding(testDb.db, opponent.id, gold);
  const older = await saveRankedWin([suspect.playerId, opponent.id], 1_000_000);
  const newer = await saveRankedWin([opponent.id, suspect.playerId], 2_000_000);
  await testDb.db.insert(gameAnalysis).values({
    duelId: older,
    round: 1,
    seat: 0,
    signalsVersion: 1,
    signals,
    analysedAt: new Date(3_000_000),
  });
  await testDb.db.insert(violation).values({
    playerId: suspect.playerId,
    duelId: older,
    round: 1,
    kind: "multipleCharacters",
    committedAt: new Date(900_000),
  });
  const [suspension] = await testDb.db
    .insert(sanction)
    .values({
      playerId: suspect.playerId,
      kind: "suspension",
      cause: "violation",
      startedAt: new Date(4_000_000),
      endsAt: new Date(5_000_000),
    })
    .returning({ id: sanction.id });
  const [standing] = await testDb.db.execute<{ mmr: number; duels_played: number }>(
    sql`select mmr, duels_played from standing where player_id = ${suspect.playerId}`,
  );

  const response = await get(`/api/admin/reviews/${suspect.reviewId}`, cookie);

  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toEqual({
    id: suspect.reviewId,
    reason: "suspicion",
    openedAt: 5000,
    settlement: null,
    player: { id: suspect.playerId, nickname: "suspect", banned: false },
    suspicion: 0.8,
    standing: {
      mmr: standing?.mmr,
      duelsPlayed: standing?.duels_played,
      rank: expect.objectContaining({ tier: "gold" }),
    },
    duels: [
      {
        duelId: newer,
        endedAt: 2_000_000,
        outcome: "loss",
        lpDelta: expect.any(Number),
        opponentNickname: "opponent",
        games: [expect.objectContaining({ round: 1, outcome: "loss", signals: null })],
      },
      {
        duelId: older,
        endedAt: 1_000_000,
        outcome: "win",
        lpDelta: expect.any(Number),
        opponentNickname: "opponent",
        games: [
          expect.objectContaining({
            round: 1,
            outcome: "win",
            signals: [
              { name: "keyPressEvenness", value: 0.9 },
              { name: "holdEvenness", value: 0.8 },
              { name: "missingRollover", value: 0.7 },
              { name: "flatWordSpeed", value: 0.25 },
              { name: "superhumanSpeed", value: 0 },
              { name: "browserHints", value: 1 },
            ],
          }),
        ],
      },
    ],
    violations: [{ duelId: older, round: 1, kind: "multipleCharacters", committedAt: 900_000 }],
    sanctions: [
      {
        id: suspension?.id,
        kind: "suspension",
        cause: "violation",
        startedAt: 4_000_000,
        endsAt: 5_000_000,
        revokedAt: null,
      },
    ],
    reports: [],
  });
});

test("a Review gives the journal, the Target words and the saved Result of each Game, so that it can be replayed", async () => {
  const { cookie } = await signInAdministrator();
  const suspect = await underReview("suspect", { reason: "suspicion", openedAt: 5000, value: 0.8 });
  const { player: opponent } = await signInPlayer(auth);
  await saveRankedWin([suspect.playerId, opponent.id], 1_000_000);
  const saved = resultOf(machineJournal());

  const response = await get(`/api/admin/reviews/${suspect.reviewId}`, cookie);

  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    duels: [
      {
        games: [
          {
            words: [...targetWords],
            journal: machineJournal(),
            result: {
              duration: saved.duration,
              wpm: saved.wpm,
              rawWpm: saved.rawWpm,
              accuracy: saved.accuracy,
              consistency: saved.consistency,
            },
          },
        ],
      },
    ],
  });
});

test("reading an open Review gives no settlement, and reading a settled one gives its decision and the instant it was settled", async () => {
  const { cookie } = await signInAdministrator();
  const open = await underReview("open", { reason: "suspicion", openedAt: 5000, value: 0.8 });
  const settled = await underReview("settled", { reason: "master", openedAt: 6000, value: null });
  await testDb.db
    .update(review)
    .set({ settledAt: new Date(7000), decision: "suspension" })
    .where(eq(review.playerId, settled.playerId));

  const openRead = await get(`/api/admin/reviews/${open.reviewId}`, cookie);
  const settledRead = await get(`/api/admin/reviews/${settled.reviewId}`, cookie);

  expect(openRead.status).toBe(200);
  expect(await openRead.json()).toMatchObject({ settlement: null });
  expect(settledRead.status).toBe(200);
  expect(await settledRead.json()).toMatchObject({
    settlement: { decision: "suspension", settledAt: 7000 },
  });
});

test("reading a Review that does not exist answers REVIEW_NOT_FOUND to the administrator", async () => {
  const { cookie } = await signInAdministrator();
  const response = await get(`/api/admin/reviews/${crypto.randomUUID()}`, cookie);
  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ code: "REVIEW_NOT_FOUND" });
});
