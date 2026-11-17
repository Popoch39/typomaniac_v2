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
