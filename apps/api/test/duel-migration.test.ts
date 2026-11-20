import { afterAll, expect, test } from "bun:test";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DUEL_GAME_CONFIG, getAverageMultiplier, getOutcome } from "@repo/duel-engine";
import { applyEvent, createGame, type GameEvent, getResult } from "@repo/typing-engine";
import { eq, sql } from "drizzle-orm";
import { migrateDatabase, duel, duelGame, duelParticipant, duelRound } from "../src/db/client.ts";
import { createTestDb } from "./helpers/db.ts";

const migrationsFolder = join(import.meta.dir, "../drizzle");

type Journal = { entries: { idx: number; tag: string }[] };

// The migrations up to the one numbered `last`, as they were before a later change.
const migrationsUpTo = async (last: number) => {
  const folder = await mkdtemp(join(tmpdir(), `migrations-up-to-${last}-`));
  const journal = JSON.parse(
    await readFile(join(migrationsFolder, "meta/_journal.json"), "utf8"),
  ) as Journal;
  const entries = journal.entries.filter(({ idx }) => idx <= last);
  await mkdir(join(folder, "meta"));
  await writeFile(join(folder, "meta/_journal.json"), JSON.stringify({ ...journal, entries }));
  for (const { tag } of entries)
    await cp(join(migrationsFolder, `${tag}.sql`), join(folder, `${tag}.sql`));
  return folder;
};

// Before Duels were saved per Round: up to the Standing table.
const beforeRounds = await migrationsUpTo(5);
const testDb = await createTestDb(beforeRounds);
// Before the Multiplier: up to the Ornament.
const beforeMultiplier = await migrationsUpTo(10);
const multiplierTestDb = await createTestDb(beforeMultiplier);
afterAll(async () => {
  await testDb.drop();
  await multiplierTestDb.drop();
  await rm(beforeRounds, { recursive: true });
  await rm(beforeMultiplier, { recursive: true });
});

test("a Duel saved before the migration reads as a single-Round Custom Duel, and replaying its journals gives its saved Results", async () => {
  const { db } = testDb;
  // Written as the API stored a Player then, without the columns later migrations add.
  const player = { id: crypto.randomUUID() };
  await db.execute(
    sql`INSERT INTO "user" (id, name, email) VALUES (${player.id}, 'ada', ${`${player.id}@example.com`})`,
  );
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
  // Judged as the API judged a Round then, before the Multiplier.
  const measures = [
    { ...results[0], multiplier: 1 },
    { ...results[1], multiplier: 1 },
  ] as const;
  const outcomes = [getOutcome(measures[0], measures[1]), getOutcome(measures[1], measures[0])];
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
    {
      duelId,
      round: 1,
      seat: 0,
      result: results[0],
      journal: journals[0],
      outcome: "win",
      multiplier: 1,
    },
    {
      duelId,
      round: 1,
      seat: 1,
      result: results[1],
      journal: journals[1],
      outcome: "loss",
      multiplier: 1,
    },
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

test("a Duel saved before the Multiplier reads with Multipliers of 1, and its Outcomes are not judged again", async () => {
  const { db } = multiplierTestDb;
  const duelId = crypto.randomUUID();
  const words = ["cat", "dog", "owl", "bee", "elk", "yak", "ant", "cow"];
  // Six Perfect words, which judged today would weigh ×1.05, against words each typed with a mistake.
  const journals: [GameEvent[], GameEvent[]] = [
    [
      { type: "start", at: 10 },
      { type: "insert", at: 1010, text: "cat dog owl bee elk yak " },
      { type: "tick", at: 30_010 },
    ],
    [
      { type: "start", at: 11 },
      ...words.flatMap((word, index): GameEvent[] => [
        { type: "insert", at: 1011 + index * 30, text: "#" },
        { type: "delete", at: 1021 + index * 30, unit: "char" },
        { type: "insert", at: 1031 + index * 30, text: `${word} ` },
      ]),
      { type: "tick", at: 30_011 },
    ],
  ];
  const results = [
    getResult(journals[0].reduce(applyEvent, createGame(DUEL_GAME_CONFIG, words))),
    getResult(journals[1].reduce(applyEvent, createGame(DUEL_GAME_CONFIG, words))),
  ] as const;
  const startedAt = new Date("2026-11-01T10:00:00.000Z");
  const endedAt = new Date("2026-11-01T10:00:30.500Z");
  // Written as the API saved a Duel then: no Multiplier on its Games.
  await db.execute(sql`
    INSERT INTO duel (id, kind, config, started_at, ended_at)
    VALUES (
      ${duelId},
      'custom',
      ${JSON.stringify(DUEL_GAME_CONFIG)}::jsonb,
      ${startedAt.toISOString()}::timestamp,
      ${endedAt.toISOString()}::timestamp
    )`);
  await db.execute(sql`
    INSERT INTO duel_round (duel_id, round, words, started_at, ended_at)
    VALUES (
      ${duelId},
      1,
      ${JSON.stringify(words)}::jsonb,
      ${startedAt.toISOString()}::timestamp,
      ${endedAt.toISOString()}::timestamp
    )`);
  for (const [seat, outcome] of ["loss", "win"].entries())
    await db.execute(sql`
      INSERT INTO duel_game (duel_id, round, seat, result, journal, outcome)
      VALUES (
        ${duelId},
        1,
        ${seat},
        ${JSON.stringify(results[seat])}::jsonb,
        ${JSON.stringify(journals[seat])}::jsonb,
        ${outcome}
      )`);

  await migrateDatabase(db, migrationsFolder);

  const perfectGame = journals[0].reduce(applyEvent, createGame(DUEL_GAME_CONFIG, words));
  expect(getAverageMultiplier(perfectGame)).toBeCloseTo(1.05, 10);
  // Read at ×1 and with the Outcomes as they were saved, whatever a judgment today would give.
  expect(
    await db
      .select({ seat: duelGame.seat, outcome: duelGame.outcome, multiplier: duelGame.multiplier })
      .from(duelGame)
      .where(eq(duelGame.duelId, duelId))
      .orderBy(duelGame.seat),
  ).toEqual([
    { seat: 0, outcome: "loss", multiplier: 1 },
    { seat: 1, outcome: "win", multiplier: 1 },
  ]);
});
