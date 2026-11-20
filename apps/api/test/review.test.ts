import { afterAll, beforeEach, expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";
import type { Standing } from "@repo/ranked-engine";
import type { GameEvent } from "@repo/typing-engine";
import { review } from "../src/db/client.ts";
import { saveDuel } from "../src/modules/duel/service.ts";
import { runFairPlayPass } from "../src/modules/fair-play/service.ts";
import { saveStanding } from "../src/modules/standing/service.ts";
import { createTestAuth, signInPlayer } from "./helpers/auth.ts";
import { createTestDb } from "./helpers/db.ts";
import { machineJournal, personJournal, resultOf, targetWords } from "./helpers/journal.ts";

const testDb = await createTestDb();
afterAll(() => testDb.drop());
const auth = createTestAuth(testDb.db);

beforeEach(async () => {
  await testDb.db.execute(sql`truncate "user" cascade`);
});

const ROUND_MS = 30_000;
const gold: Standing = { mmr: 1384, duelsPlayed: 40, rank: { tier: "gold", division: 3, lp: 50 } };
const master = (lp: number): Standing => ({
  mmr: 2600,
  duelsPlayed: 200,
  rank: { tier: "master", lp },
});

const signInWith = async (standing: Standing) => {
  const { player } = await signInPlayer(auth);
  await saveStanding(testDb.db, player.id, standing);
  return player.id;
};

// Three Players at the top of the Leaderboard, already reviewed for Master and the Podium, so that
// the Players of a test play below the Podium.
const fillPodium = async () => {
  for (const lp of [900, 800, 700]) {
    const playerId = await signInWith(master(lp));
    const settled = {
      playerId,
      openedAt: new Date(0),
      settledAt: new Date(0),
      decision: "cleared",
    } as const;
    await testDb.db.insert(review).values([
      { ...settled, reason: "master" },
      { ...settled, reason: "podium" },
    ]);
  }
};

// Saves a one-Round ranked Duel between two Players as the API saves one, started at `startAt`.
const saveRankedDuel = (
  playerIds: readonly [string, string],
  journals: readonly [GameEvent[], GameEvent[]],
  startAt = Date.now() - ROUND_MS,
) =>
  saveDuel(testDb.db, crypto.randomUUID(), {
    kind: "ranked",
    playerIds,
    outcomes: ["win", "loss"],
    rounds: [
      {
        number: 1,
        words: [...targetWords],
        startAt,
        endedAt: startAt + ROUND_MS,
        journals,
        results: [resultOf(journals[0]), resultOf(journals[1])],
        multipliers: [1, 1],
        outcomes: ["win", "loss"],
      },
    ],
  });

// `count` ranked Duels in which a script plays a person.
const playScripted = async (
  scriptId: string,
  personId: string,
  count: number,
  startAt?: number,
) => {
  for (let duel = 0; duel < count; duel++)
    await saveRankedDuel(
      [scriptId, personId],
      [machineJournal(), personJournal(duel)],
      startAt === undefined ? undefined : startAt + duel * ROUND_MS,
    );
};

const reviewsOf = (playerId: string) =>
  testDb.db
    .select({
      reason: review.reason,
      openedAt: review.openedAt,
      settledAt: review.settledAt,
      decision: review.decision,
    })
    .from(review)
    .where(eq(review.playerId, playerId))
    .orderBy(review.openedAt);

const clear = (playerId: string, at: number) =>
  testDb.db
    .update(review)
    .set({ settledAt: new Date(at), decision: "cleared" })
    .where(eq(review.playerId, playerId));

test("a pass over bot-like ranked Duels opens one Review with reason Suspicion, and a second pass opens no second one", async () => {
  await fillPodium();
  const [scriptId, personId] = [await signInWith(gold), await signInWith(gold)];
  await playScripted(scriptId, personId, 20);
  const at = Date.now();

  await runFairPlayPass(testDb.db, at);
  await runFairPlayPass(testDb.db, at + 60_000);

  expect(await reviewsOf(scriptId)).toEqual([
    { reason: "suspicion", openedAt: new Date(at), settledAt: null, decision: null },
  ]);
  expect(await reviewsOf(personId)).toEqual([]);
});

test("a Player who reaches Master gets a Review with reason Master, opened once", async () => {
  await fillPodium();
  const playerId = await signInWith(master(100));
  const at = Date.now();

  await runFairPlayPass(testDb.db, at);
  await clear(playerId, at + 1000);
  await runFairPlayPass(testDb.db, at + 60_000);

  expect(await reviewsOf(playerId)).toEqual([
    {
      reason: "master",
      openedAt: new Date(at),
      settledAt: new Date(at + 1000),
      decision: "cleared",
    },
  ]);
});

test("a Player who enters the Podium gets a Review with reason Podium, opened once", async () => {
  const playerId = await signInWith(gold);
  const at = Date.now();

  await runFairPlayPass(testDb.db, at);
  await clear(playerId, at + 1000);
  await runFairPlayPass(testDb.db, at + 60_000);

  expect((await reviewsOf(playerId)).map(({ reason }) => reason)).toEqual(["podium"]);
});

test("a banned Player leaves the Podium to the Player after them", async () => {
  const bannedId = await signInWith(master(900));
  await testDb.db.execute(sql`update "user" set banned_at = now() where id = ${bannedId}`);
  const players = [await signInWith(gold), await signInWith(gold), await signInWith(gold)];

  await runFairPlayPass(testDb.db, Date.now());

  expect(await reviewsOf(bannedId)).toEqual([]);
  for (const playerId of players)
    expect((await reviewsOf(playerId)).map(({ reason }) => reason)).toEqual(["podium"]);
});

test("a cleared Player gets no new Review from the Games already judged, and gets one when Games played after the clearing pass the threshold", async () => {
  await fillPodium();
  const [scriptId, personId] = [await signInWith(gold), await signInWith(gold)];
  const start = Date.now() - 100 * ROUND_MS;
  await playScripted(scriptId, personId, 20, start);
  const firstPass = start + 20 * ROUND_MS;
  await runFairPlayPass(testDb.db, firstPass);
  const clearedAt = firstPass + 1000;
  await clear(scriptId, clearedAt);

  await runFairPlayPass(testDb.db, clearedAt + 1000);
  expect(await reviewsOf(scriptId)).toHaveLength(1);

  // A few bot-like Games after the clearing are not enough on their own.
  await playScripted(scriptId, personId, 5, clearedAt + 2000);
  await runFairPlayPass(testDb.db, clearedAt + 10 * ROUND_MS);
  expect(await reviewsOf(scriptId)).toHaveLength(1);

  await playScripted(scriptId, personId, 15, clearedAt + 10 * ROUND_MS);
  const reopenedAt = clearedAt + 40 * ROUND_MS;
  await runFairPlayPass(testDb.db, reopenedAt);
  expect(await reviewsOf(scriptId)).toEqual([
    expect.objectContaining({ reason: "suspicion", decision: "cleared" }),
    { reason: "suspicion", openedAt: new Date(reopenedAt), settledAt: null, decision: null },
  ]);
});
