import { afterAll, expect, test } from "bun:test";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DUEL_GAME_CONFIG, getOutcome } from "@repo/duel-engine";
import { applyEvent, createGame, type GameEvent, getResult } from "@repo/typing-engine";
import { eq, sql } from "drizzle-orm";
import { migrateDatabase } from "../src/db/client.ts";
import { duel, duelGame, duelParticipant, duelRound } from "../src/db/schema.ts";
import { createTestAuth, signInPlayer } from "./helpers/auth.ts";
import { createTestDb } from "./helpers/db.ts";

const migrationsFolder = join(import.meta.dir, "../drizzle");

type Journal = { entries: { idx: number; tag: string }[] };

// The migrations as they were before Duels were saved per Round: up to the Standing table.
const migrationsBeforeRounds = async () => {
  const folder = await mkdtemp(join(tmpdir(), "migrations-before-rounds-"));
  const journal = JSON.parse(
    await readFile(join(migrationsFolder, "meta/_journal.json"), "utf8"),
  ) as Journal;
  const entries = journal.entries.filter(({ idx }) => idx <= 5);
  await mkdir(join(folder, "meta"));
  await writeFile(join(folder, "meta/_journal.json"), JSON.stringify({ ...journal, entries }));
  for (const { tag } of entries)
    await cp(join(migrationsFolder, `${tag}.sql`), join(folder, `${tag}.sql`));
  return folder;
};

const before = await migrationsBeforeRounds();
const testDb = await createTestDb(before);
afterAll(async () => {
  await testDb.drop();
  await rm(before, { recursive: true });
});

test("a Duel saved before the migration reads as a single-Round Custom Duel, and replaying its journals gives its saved Results", async () => {
  const { db } = testDb;
  const { player } = await signInPlayer(createTestAuth(db));
  const duelId = crypto.randomUUID();
  const words = ["cat", "dog", "owl"];
  const journals: [GameEvent[], GameEvent[]] = [
    [
      { type: "start", at: 10 },
      { type: "insert", at: 1010, text: "cat " },
      { type: "tick", at: 30_010 },
    ],
    [
      { type: "start", at: 11 },
      { type: "insert", at: 1011, text: "x" },
      { type: "tick", at: 30_011 },
    ],
  ];
  const results = [
    getResult(journals[0].reduce(applyEvent, createGame(DUEL_GAME_CONFIG, words))),
    getResult(journals[1].reduce(applyEvent, createGame(DUEL_GAME_CONFIG, words))),
  ] as const;
  const outcomes = [getOutcome(results[0], results[1]), getOutcome(results[1], results[0])];
  const startedAt = new Date("2026-10-01T10:00:00.000Z");
  const endedAt = new Date("2026-10-01T10:00:30.500Z");
  // Written as the API saved a Duel then: its words on the Duel, its Player on the Game.
  await db.execute(sql`
    INSERT INTO duel (id, config, words, started_at, ended_at)
    VALUES (
      ${duelId},
      ${JSON.stringify(DUEL_GAME_CONFIG)}::jsonb,
      ${JSON.stringify(words)}::jsonb,
      ${startedAt.toISOString()}::timestamp,
      ${endedAt.toISOString()}::timestamp
    )`);
  for (const [seat, playerId] of [player.id, null].entries())
    await db.execute(sql`
      INSERT INTO duel_game (duel_id, seat, player_id, result, journal, outcome)
      VALUES (
        ${duelId},
        ${seat},
        ${playerId},
        ${JSON.stringify(results[seat])}::jsonb,
        ${JSON.stringify(journals[seat])}::jsonb,
        ${outcomes[seat]}
      )`);

  await migrateDatabase(db, migrationsFolder);

  const rounds = await db.select().from(duelRound).where(eq(duelRound.duelId, duelId));
  const games = await db
    .select()
    .from(duelGame)
    .where(eq(duelGame.duelId, duelId))
    .orderBy(duelGame.seat);
  expect(await db.select().from(duel).where(eq(duel.id, duelId))).toEqual([
    { id: duelId, kind: "custom", config: DUEL_GAME_CONFIG, startedAt, endedAt },
  ]);
  expect(rounds).toEqual([{ duelId, round: 1, words, startedAt, endedAt }]);
  expect(games).toEqual([
    { duelId, round: 1, seat: 0, result: results[0], journal: journals[0], outcome: "win" },
    { duelId, round: 1, seat: 1, result: results[1], journal: journals[1], outcome: "loss" },
  ]);
  expect(
    await db
      .select({
        duelId: duelParticipant.duelId,
        seat: duelParticipant.seat,
        playerId: duelParticipant.playerId,
        outcome: duelParticipant.outcome,
      })
      .from(duelParticipant)
      .where(eq(duelParticipant.duelId, duelId))
      .orderBy(duelParticipant.seat),
  ).toEqual([
    { duelId, seat: 0, playerId: player.id, outcome: "win" },
    { duelId, seat: 1, playerId: null, outcome: "loss" },
  ]);
  for (const game of games) {
    const replayed = game.journal.reduce(
      applyEvent,
      createGame(DUEL_GAME_CONFIG, rounds[0]?.words ?? []),
    );
    expect(getResult(replayed)).toEqual(game.result);
  }
});
