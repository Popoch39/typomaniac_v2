import { afterAll, expect, test } from "bun:test";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { DUEL_GAME_CONFIG } from "@repo/duel-engine";
import { eq, sql } from "drizzle-orm";
import {
  type Db,
  duel,
  duelParticipant,
  migrateDatabase,
  sanction,
  user,
  violation,
} from "../src/db/client.ts";
import { createTestDb, migrationsUpTo } from "./helpers/db.ts";

const testDb = await createTestDb();
// Before the integrity checks: up to the Friends.
const beforeChecks = await migrationsUpTo(25);
const legacyTestDb = await createTestDb(beforeChecks);
afterAll(async () => {
  await testDb.drop();
  await legacyTestDb.drop();
  await rm(beforeChecks, { recursive: true });
});

const refusal = (write: Promise<unknown>) =>
  write.then(
    () => null,
    (error: unknown) => error,
  );

const savePlayer = async (db: Db) => {
  const id = crypto.randomUUID();
  await db.insert(user).values({ id, name: "p", email: `${id}@example.com` });
  return id;
};

const saveDuel = async (db: Db, kind: "custom" | "ranked") => {
  const id = crypto.randomUUID();
  await db
    .insert(duel)
    .values({ id, kind, config: DUEL_GAME_CONFIG, startedAt: new Date(), endedAt: new Date() });
  return id;
};

const RANKED_COLUMNS = {
  mmrBefore: 1200,
  mmrAfter: 1216,
  duelsPlayedBefore: 4,
  duelsPlayedAfter: 5,
  ladderIndexBefore: null,
  lpBefore: null,
  ladderIndexAfter: 5,
  lpAfter: 0,
  lpDelta: 0,
  rankChange: "placed",
} as const;

test("a Suspension without an end and a Ban or Voided Duel with one are refused", async () => {
  const { db } = testDb;
  const playerId = await savePlayer(db);
  const startedAt = new Date();
  const endsAt = new Date(startedAt.getTime() + 60_000);

  for (const values of [
    { kind: "suspension", endsAt: null },
    { kind: "ban", endsAt },
    { kind: "voided_duel", endsAt },
  ] as const)
    expect(
      await refusal(
        db.insert(sanction).values({ playerId, cause: "review", startedAt, ...values }),
      ),
    ).toBeInstanceOf(Error);

  await db.insert(sanction).values([
    { playerId, kind: "suspension", cause: "review", startedAt, endsAt },
    { playerId, kind: "ban", cause: "review", startedAt },
    { playerId, kind: "voided_duel", cause: "review", startedAt },
  ]);
});

test("a Violation with only one of its sanctioned instant and Sanction is refused", async () => {
  const { db } = testDb;
  const playerId = await savePlayer(db);
  const [saved] = await db
    .insert(sanction)
    .values({ playerId, kind: "ban", cause: "violation", startedAt: new Date() })
    .returning({ id: sanction.id });
  const sanctionId = saved?.id;
  const committed = {
    playerId,
    duelId: crypto.randomUUID(),
    round: 1,
    kind: "multipleCharacters",
  } as const;

  expect(
    await refusal(db.insert(violation).values({ ...committed, sanctionedAt: new Date() })),
  ).toBeInstanceOf(Error);
  expect(await refusal(db.insert(violation).values({ ...committed, sanctionId }))).toBeInstanceOf(
    Error,
  );

  await db
    .insert(violation)
    .values([committed, { ...committed, sanctionedAt: new Date(), sanctionId }]);
});

test("a Player with a sanctioned Violation can still be deleted", async () => {
  const { db } = testDb;
  const playerId = await savePlayer(db);
  const [saved] = await db
    .insert(sanction)
    .values({ playerId, kind: "ban", cause: "violation", startedAt: new Date() })
    .returning({ id: sanction.id });
  await db.insert(violation).values({
    playerId,
    duelId: crypto.randomUUID(),
    round: 1,
    kind: "noKeyPress",
    sanctionedAt: new Date(),
    sanctionId: saved?.id,
  });

  await db.delete(user).where(eq(user.id, playerId));

  expect(await db.select().from(violation).where(eq(violation.playerId, playerId))).toEqual([]);
});

test("a Duel participant with only some of its ranked columns is refused", async () => {
  const { db } = testDb;
  const playerId = await savePlayer(db);
  const duelId = await saveDuel(db, "ranked");
  const seat = { duelId, seat: 0, playerId, outcome: "win" } as const;

  for (const partial of [
    { duelsPlayedBefore: 4 },
    { ...RANKED_COLUMNS, lpDelta: null },
    { ...RANKED_COLUMNS, lpAfter: null },
    { ...RANKED_COLUMNS, ladderIndexBefore: 4 },
  ])
    expect(
      await refusal(db.insert(duelParticipant).values({ ...seat, ...partial })),
    ).toBeInstanceOf(Error);

  // Unranked before and after, then ranked before and after, are both whole.
  await db.insert(duelParticipant).values({
    ...seat,
    ...RANKED_COLUMNS,
    ladderIndexAfter: null,
    lpAfter: null,
    rankChange: "none",
  });
  await db.insert(duelParticipant).values({
    ...seat,
    duelId: await saveDuel(db, "ranked"),
    ...RANKED_COLUMNS,
    ladderIndexBefore: 5,
    lpBefore: 0,
    lpDelta: 18,
    lpAfter: 18,
    rankChange: "none",
  });
  await db
    .insert(duelParticipant)
    .values({ ...seat, duelId: await saveDuel(db, "custom"), playerId: null });
});

test("the migration refuses a database with half-defined rows and names what it found", async () => {
  const { db } = legacyTestDb;
  const playerId = await savePlayer(db);
  await db.execute(
    sql`INSERT INTO sanction (player_id, kind, cause, started_at) VALUES (${playerId}, 'suspension', 'review', now())`,
  );
  await db.execute(
    sql`INSERT INTO violation (player_id, duel_id, round, kind, sanctioned_at) VALUES (${playerId}, ${crypto.randomUUID()}, 1, 'noKeyPress', now())`,
  );
  const duelId = await saveDuel(db, "ranked");
  await db.execute(
    sql`INSERT INTO duel_participant (duel_id, seat, player_id, outcome, duels_played_before) VALUES (${duelId}, 0, ${playerId}, 'win', 3)`,
  );

  const failure = await refusal(migrateDatabase(db, join(import.meta.dir, "../drizzle")));

  expect(failure).toBeInstanceOf(Error);
  const message =
    failure instanceof Error
      ? `${failure.message} ${failure.cause instanceof Error ? failure.cause.message : ""}`
      : "";
  expect(message).toContain("1 Sanction");
  expect(message).toContain("1 Violation");
  expect(message).toContain("1 Duel participant");
});
