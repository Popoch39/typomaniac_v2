import { afterAll, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { DUEL_GAME_CONFIG, type Outcome } from "@repo/duel-engine";
import type { Standing } from "@repo/ranked-engine";
import { applyEvent, createGame, type GameEvent, getResult } from "@repo/typing-engine";
import { sanction, voidedDuel } from "../src/db/client.ts";
import { recordViolation, saveDuel } from "../src/modules/duel/service.ts";
import { runFairPlayPass } from "../src/modules/fair-play/service.ts";
import { readStanding, saveStanding } from "../src/modules/standing/service.ts";
import { createTestAuth, signInPlayer } from "./helpers/auth.ts";
import { createTestDb } from "./helpers/db.ts";

const testDb = await createTestDb();
afterAll(() => testDb.drop());
const auth = createTestAuth(testDb.db);

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

const signInRanked = async () => {
  const { player } = await signInPlayer(auth);
  await saveStanding(testDb.db, player.id, even);
  return player.id;
};

// Saves a ranked Duel between two Players as the API saves one, ended now.
const saveRankedDuel = async (
  duelId: string,
  playerIds: readonly [string, string],
  outcomes: readonly [Outcome, Outcome],
) => {
  await saveDuel(testDb.db, duelId, {
    kind: "ranked",
    playerIds,
    outcomes,
    rounds: [
      {
        number: 1,
        words,
        startAt: Date.now() - 30_000,
        endedAt: Date.now(),
        journals: [journal, journal],
        results: [result, result],
        multipliers: [1, 1],
        outcomes,
      },
    ],
  });
};

// A ranked Duel the cheater won against a new Opponent, with a Violation of theirs recorded in it.
const winWithViolation = async (cheaterId: string) => {
  const duelId = crypto.randomUUID();
  await recordViolation(testDb.db, {
    playerId: cheaterId,
    duelId,
    round: 1,
    kind: "multipleCharacters",
  });
  await saveRankedDuel(duelId, [cheaterId, await signInRanked()], ["win", "loss"]);
  return duelId;
};

const sanctionsOf = (playerId: string) =>
  testDb.db
    .select({
      kind: sanction.kind,
      cause: sanction.cause,
      startedAt: sanction.startedAt,
      endsAt: sanction.endsAt,
    })
    .from(sanction)
    .where(eq(sanction.playerId, playerId))
    .orderBy(sanction.startedAt);

const voidedUnder = (duelId: string) =>
  testDb.db
    .select({ kind: sanction.kind })
    .from(voidedDuel)
    .innerJoin(sanction, eq(sanction.id, voidedDuel.sanctionId))
    .where(eq(voidedDuel.duelId, duelId));

test("the pass voids a saved ranked Duel with a Violation, and a second pass changes nothing", async () => {
  const cheaterId = await signInRanked();
  const duelId = await winWithViolation(cheaterId);

  await runFairPlayPass(testDb.db, Date.now());
  const voided = await readStanding(testDb.db, cheaterId);
  await runFairPlayPass(testDb.db, Date.now());

  expect(await voidedUnder(duelId)).toEqual([{ kind: "voided_duel" }]);
  expect(await sanctionsOf(cheaterId)).toEqual([
    expect.objectContaining({ kind: "voided_duel", cause: "violation" }),
  ]);
  // The +16 MMR and +30 LP it won are withdrawn, once; the Duel still counts as played.
  const withdrawn = { ...even, duelsPlayed: even.duelsPlayed + 1 };
  expect(voided).toEqual(withdrawn);
  expect(await readStanding(testDb.db, cheaterId)).toEqual(withdrawn);
});

test("a second, third and fourth Duel with a Violation give a 3-day Suspension, a 14-day Suspension and a Ban, each with cause Violation", async () => {
  const cheaterId = await signInRanked();
  const duelIds = [];
  for (let repeat = 0; repeat < 4; repeat++) {
    duelIds.push(await winWithViolation(cheaterId));
    await runFairPlayPass(testDb.db, Date.now());
  }

  const sanctions = await sanctionsOf(cheaterId);
  expect(sanctions.map(({ kind, cause }) => ({ kind, cause }))).toEqual([
    { kind: "voided_duel", cause: "violation" },
    { kind: "suspension", cause: "violation" },
    { kind: "suspension", cause: "violation" },
    { kind: "ban", cause: "violation" },
  ]);
  const lengths = sanctions.map(({ startedAt, endsAt }) =>
    endsAt === null ? null : endsAt.getTime() - startedAt.getTime(),
  );
  expect(lengths).toEqual([null, 3 * DAY_MS, 14 * DAY_MS, null]);
  // A Suspension voids the Duel won with the Violation that brought it, as every Duel won before it.
  expect(await voidedUnder(duelIds[1] ?? "")).toEqual([{ kind: "suspension" }]);
});

test("several Violations in one Duel are sanctioned once", async () => {
  const cheaterId = await signInRanked();
  const duelId = await winWithViolation(cheaterId);
  await recordViolation(testDb.db, { playerId: cheaterId, duelId, round: 2, kind: "noKeyPress" });

  await runFairPlayPass(testDb.db, Date.now());
  await winWithViolation(cheaterId);
  await runFairPlayPass(testDb.db, Date.now());

  // One Voided Duel for the first Duel, then a first Suspension, not a second one, for the next.
  expect(
    (await sanctionsOf(cheaterId)).map(({ kind, endsAt, startedAt }) => ({
      kind,
      lengthMs: endsAt === null ? null : endsAt.getTime() - startedAt.getTime(),
    })),
  ).toEqual([
    { kind: "voided_duel", lengthMs: null },
    { kind: "suspension", lengthMs: 3 * DAY_MS },
  ]);
});

test("a Violation whose Duel is not saved yet is left for a later pass", async () => {
  const cheaterId = await signInRanked();
  const duelId = crypto.randomUUID();
  await recordViolation(testDb.db, { playerId: cheaterId, duelId, round: 1, kind: "noKeyPress" });

  await runFairPlayPass(testDb.db, Date.now());
  expect(await sanctionsOf(cheaterId)).toEqual([]);

  await saveRankedDuel(duelId, [cheaterId, await signInRanked()], ["win", "loss"]);
  await runFairPlayPass(testDb.db, Date.now());
  expect(await voidedUnder(duelId)).toEqual([{ kind: "voided_duel" }]);
});

test("a Duel saved after the instant of the pass is left for a later pass", async () => {
  const cheaterId = await signInRanked();
  const before = Date.now() - 1000;
  const duelId = await winWithViolation(cheaterId);

  await runFairPlayPass(testDb.db, before);

  expect(await voidedUnder(duelId)).toEqual([]);
});
