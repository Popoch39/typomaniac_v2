import { afterAll, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { createTestDb } from "./helpers/db.ts";

const testDb = await createTestDb();
afterAll(() => testDb.drop());

test("test database is migrated and answers queries", async () => {
  const { db } = testDb;
  const migrationsTable = await db.execute(
    sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations'`,
  );
  expect([...migrationsTable]).toEqual([{ table_name: "__drizzle_migrations" }]);
  expect([...(await db.execute(sql`SELECT 1 AS one`))]).toEqual([{ one: 1 }]);
});

test("a new Player's Ornament choice is Auto, and only the allowed choices are stored", async () => {
  const { db } = testDb;
  await db.execute(
    sql`INSERT INTO "user" (id, name, email) VALUES ('ornament-player', 'p', 'ornament@example.com')`,
  );
  const [stored] = await db.execute(sql`SELECT ornament FROM "user" WHERE id = 'ornament-player'`);
  expect(stored).toEqual({ ornament: "auto" });

  await db.execute(sql`UPDATE "user" SET ornament = 'master' WHERE id = 'ornament-player'`);
  const unknownChoice = async () =>
    db.execute(sql`UPDATE "user" SET ornament = 'emerald' WHERE id = 'ornament-player'`);
  const failure = await unknownChoice().then(
    () => null,
    (error: unknown) => error,
  );
  expect(failure).toBeInstanceOf(Error);
});
