import { afterAll, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { SIGNAL_WEIGHTS, SIGNALS_VERSION } from "@repo/fair-play-engine";
import type { Standing } from "@repo/ranked-engine";
import type { BrowserHints } from "@repo/duel-engine";
import type { GameEvent } from "@repo/typing-engine";
import { gameAnalysis, review, sanction, suspicion } from "../src/db/client.ts";
import { saveDuel } from "../src/modules/duel/service.ts";
import { runFairPlayPass } from "../src/modules/fair-play/service.ts";
import { readStanding, saveStanding } from "../src/modules/standing/service.ts";
import { createTestAuth, signInPlayer } from "./helpers/auth.ts";
import { createTestDb } from "./helpers/db.ts";
import {
  idleJournal,
  machineJournal,
  personJournal,
  resultOf,
  targetWords,
} from "./helpers/journal.ts";

const testDb = await createTestDb();
afterAll(() => testDb.drop());
const auth = createTestAuth(testDb.db);

const even: Standing = { mmr: 1384, duelsPlayed: 40, rank: { tier: "gold", division: 3, lp: 50 } };

const signInRanked = async () => {
  const { player } = await signInPlayer(auth);
  await saveStanding(testDb.db, player.id, even);
  return player.id;
};

// Saves a one-Round Duel between two Players as the API saves one, ended at `endedAt`, each seat
// typing its journal; the first seat wins it.
const saveOneRoundDuel = async (
  kind: "ranked" | "custom",
  playerIds: readonly [string, string],
  journals: readonly [GameEvent[], GameEvent[]],
  endedAt = Date.now(),
  hints?: readonly [BrowserHints | null, BrowserHints | null],
) => {
  const duelId = crypto.randomUUID();
  await saveDuel(testDb.db, duelId, {
    kind,
    playerIds,
    outcomes: ["win", "loss"],
    rounds: [
      {
        number: 1,
        words: [...targetWords],
        startAt: endedAt - 30_000,
        endedAt,
        journals,
        hints,
        results: [resultOf(journals[0]), resultOf(journals[1])],
        multipliers: [1, 1],
        outcomes: ["win", "loss"],
      },
    ],
  });
  return duelId;
};

const analysesOf = (duelId: string) =>
  testDb.db
    .select({
      seat: gameAnalysis.seat,
      signalsVersion: gameAnalysis.signalsVersion,
      signals: gameAnalysis.signals,
      analysedAt: gameAnalysis.analysedAt,
    })
    .from(gameAnalysis)
    .where(eq(gameAnalysis.duelId, duelId))
    .orderBy(gameAnalysis.seat);

const suspicionOf = async (playerId: string) => {
  const [row] = await testDb.db
    .select({
      value: suspicion.value,
      duelSignals: suspicion.duelSignals,
      computedAt: suspicion.computedAt,
    })
    .from(suspicion)
    .where(eq(suspicion.playerId, playerId));
  return row ?? null;
};

test("the pass saves the signals of each saved ranked Game with the signals' version, and each Player's Suspicion with its instant; a second pass analyses nothing twice", async () => {
  const [scriptId, personId] = [await signInRanked(), await signInRanked()];
  const duelId = await saveOneRoundDuel(
    "ranked",
    [scriptId, personId],
    [machineJournal(), personJournal()],
  );
  const at = Date.now();

  await runFairPlayPass(testDb.db, at);
  const first = await analysesOf(duelId);
  const firstSuspicion = await suspicionOf(scriptId);
  await runFairPlayPass(testDb.db, at + 60_000);

  expect(first.map(({ seat, signalsVersion }) => ({ seat, signalsVersion }))).toEqual([
    { seat: 0, signalsVersion: SIGNALS_VERSION },
    { seat: 1, signalsVersion: SIGNALS_VERSION },
  ]);
  expect(first[0]?.signals.keyPressEvenness).toBe(1);
  expect(first[1]?.signals.keyPressEvenness).toBe(0);
  expect(first.every(({ analysedAt }) => analysedAt.getTime() === at)).toBe(true);
  expect(firstSuspicion?.computedAt.getTime()).toBe(at);
  expect(firstSuspicion?.value).toBeGreaterThan(0);
  expect((await suspicionOf(personId))?.value).toBe(0);
  // The second pass found nothing new: the analyses and the Suspicion keep their first instant.
  expect(await analysesOf(duelId)).toEqual(first);
  expect(await suspicionOf(scriptId)).toEqual(firstSuspicion);
});

test("a Custom Duel is never analysed", async () => {
  const [firstId, secondId] = [await signInRanked(), await signInRanked()];
  const duelId = await saveOneRoundDuel(
    "custom",
    [firstId, secondId],
    [machineJournal(), machineJournal()],
  );

  await runFairPlayPass(testDb.db, Date.now());

  expect(await analysesOf(duelId)).toEqual([]);
  expect(await suspicionOf(firstId)).toBeNull();
});

test("raising the signals' version makes the pass analyse the saved Games again", async () => {
  const [scriptId, personId] = [await signInRanked(), await signInRanked()];
  const duelId = await saveOneRoundDuel(
    "ranked",
    [scriptId, personId],
    [machineJournal(), personJournal()],
  );
  await runFairPlayPass(testDb.db, Date.now());
  // As if the Game had been read by the version before the current one, which said nothing of it.
  const silent = {
    keyPressEvenness: 0,
    holdEvenness: 0,
    missingRollover: 0,
    flatWordSpeed: 0,
    superhumanSpeed: 0,
    browserHints: 0,
  };
  await testDb.db
    .update(gameAnalysis)
    .set({ signalsVersion: SIGNALS_VERSION - 1, signals: silent })
    .where(eq(gameAnalysis.duelId, duelId));
  const at = Date.now() + 60_000;

  await runFairPlayPass(testDb.db, at);

  const [script] = await analysesOf(duelId);
  expect(script?.signalsVersion).toBe(SIGNALS_VERSION);
  expect(script?.signals.keyPressEvenness).toBe(1);
  expect(script?.analysedAt.getTime()).toBe(at);
  expect((await suspicionOf(scriptId))?.computedAt.getTime()).toBe(at);
});

test("ranked Games typed by a script raise the Player's Suspicion, one unusual Game among many ordinary ones leaves it low, and Suspicion neither sanctions nor moves a Standing", async () => {
  const [scriptId, personId] = [await signInRanked(), await signInRanked()];
  // Each against a new Opponent, so that no pair of Players speaks.
  for (let duel = 0; duel < 20; duel++) {
    await saveOneRoundDuel(
      "ranked",
      [scriptId, await signInRanked()],
      [machineJournal(), personJournal(duel)],
    );
    // The person's one unusual Game, typed by a script at their own pace.
    const journal = duel === 19 ? machineJournal(110) : personJournal(duel);
    await saveOneRoundDuel("ranked", [personId, await signInRanked()], [journal, personJournal()]);
  }
  const standings = [
    await readStanding(testDb.db, scriptId),
    await readStanding(testDb.db, personId),
  ];

  await runFairPlayPass(testDb.db, Date.now());

  expect((await suspicionOf(scriptId))?.value).toBeGreaterThan(0.5);
  expect((await suspicionOf(personId))?.value).toBeLessThan(0.1);
  expect(await testDb.db.select().from(sanction).where(eq(sanction.playerId, scriptId))).toEqual(
    [],
  );
  expect([
    await readStanding(testDb.db, scriptId),
    await readStanding(testDb.db, personId),
  ]).toEqual(standings);
});

test("the pass includes the signals across each Player's recent ranked Duels in their Suspicion and saves their values: two Players trading wins both have a one-sided pair, and the one losing without typing is seen", async () => {
  const [winnerId, loserId] = [await signInRanked(), await signInRanked()];
  for (let duel = 0; duel < 6; duel++)
    await saveOneRoundDuel("ranked", [winnerId, loserId], [personJournal(duel), idleJournal()]);

  await runFairPlayPass(testDb.db, Date.now());

  const [winner, loser] = [await suspicionOf(winnerId), await suspicionOf(loserId)];
  expect(winner?.duelSignals.oneSidedPair).toBe(1);
  expect(loser?.duelSignals).toEqual({
    levelJump: 0,
    errorlessSeries: 0,
    oneSidedPair: 1,
    lossWithoutTyping: 1,
    reports: 0,
  });
  expect(loser?.value).toBeCloseTo(SIGNAL_WEIGHTS.oneSidedPair + SIGNAL_WEIGHTS.lossWithoutTyping);
});

test("the pass reads a level jump in the order the ranked Duels were played", async () => {
  const [risingId, fallingId] = [await signInRanked(), await signInRanked()];
  const start = Date.now() - 60 * 60_000;
  // Typed at a person's pace, then by a script more than twice as fast, against new Opponents.
  const journals = [personJournal(1), personJournal(2), personJournal(3), machineJournal(45)];
  for (const [index, journal] of journals.entries()) {
    const endedAt = start + index * 60_000;
    await saveOneRoundDuel(
      "ranked",
      [risingId, await signInRanked()],
      [journal, idleJournal()],
      endedAt,
    );
    // The same Games played the other way round: a level that drops.
    const reversed = journals[journals.length - 1 - index] ?? journal;
    await saveOneRoundDuel(
      "ranked",
      [fallingId, await signInRanked()],
      [reversed, idleJournal()],
      endedAt,
    );
  }

  await runFairPlayPass(testDb.db, Date.now());

  expect((await suspicionOf(risingId))?.duelSignals.levelJump).toBe(1);
  expect((await suspicionOf(fallingId))?.duelSignals.levelJump).toBe(0);
});

test("the signals across Duels read only the ranked Duels started after the Player's last settled Review, as the Review does", async () => {
  const [winnerId, loserId] = [await signInRanked(), await signInRanked()];
  const start = Date.now() - 60 * 60_000;
  for (let duel = 0; duel < 6; duel++)
    await saveOneRoundDuel(
      "ranked",
      [winnerId, loserId],
      [personJournal(duel), idleJournal()],
      start + duel * 60_000,
    );
  await runFairPlayPass(testDb.db, start + 10 * 60_000);
  const settledAt = new Date(start + 11 * 60_000);
  await testDb.db.insert(review).values({
    playerId: loserId,
    reason: "suspicion",
    openedAt: settledAt,
    settledAt,
    decision: "cleared",
  });
  await saveOneRoundDuel(
    "ranked",
    [loserId, await signInRanked()],
    [personJournal(), personJournal(8)],
    start + 20 * 60_000,
  );

  await runFairPlayPass(testDb.db, start + 30 * 60_000);

  expect((await suspicionOf(loserId))?.duelSignals).toEqual({
    levelJump: 0,
    errorlessSeries: 0,
    oneSidedPair: 0,
    lossWithoutTyping: 0,
    reports: 0,
  });
  // The winner was never reviewed: all their Duels still count.
  expect((await suspicionOf(winnerId))?.duelSignals.oneSidedPair).toBe(1);
});

test("the browser's hints saved with a ranked Game are a signal of its Player's Suspicion, shown with its value in the Game's analysis", async () => {
  const [botId, personId] = [await signInRanked(), await signInRanked()];
  const duelIds = [];
  for (let duel = 0; duel < 20; duel++)
    duelIds.push(
      await saveOneRoundDuel(
        "ranked",
        [botId, personId],
        [personJournal(duel), personJournal(duel + 100)],
        Date.now(),
        [{ scriptedKeys: 0, automated: true }, null],
      ),
    );

  await runFairPlayPass(testDb.db, Date.now());

  const [bot, person] = await analysesOf(duelIds[0] ?? "");
  expect(bot?.signals.browserHints).toBe(1);
  expect(person?.signals.browserHints).toBe(0);
  // Typed like a person in every other way: the hints alone raise the Suspicion.
  expect((await suspicionOf(botId))?.value).toBeGreaterThan(
    (await suspicionOf(personId))?.value ?? 1,
  );
});
