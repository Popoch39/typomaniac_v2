import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { migrate } from "drizzle-orm/bun-sql/migrator";
import * as schema from "./schema.ts";

export const requireDatabaseUrl = () => {
  const url = process.env.DATABASE_URL;
  if (!url)
    throw new Error("DATABASE_URL is not set: copy the app's .env.example to .env in its folder");
  return url;
};

// The schema is passed so Better Auth's Drizzle adapter can find its tables on the client.
export const openDatabase = (url: string) => drizzle({ client: new SQL(url), schema });

export type Db = ReturnType<typeof openDatabase>;

/** What a `db.transaction` callback is given to read and write through. */
export type Transaction = Parameters<Parameters<Db["transaction"]>[0]>[0];

// Arbitrary constant shared by every process that migrates (only the API, ADR 0002), so only one of them migrates at a time.
// Kept within int4 so Postgres resolves it to the bigint overload without depending on how Bun binds numbers.
const MIGRATION_LOCK_KEY = 738_120_451;

export const migrateDatabase = async (db: Db, migrationsFolder: string) => {
  // A session-level advisory lock is released only by the connection that took it,
  // so it lives on a reserved connection while the migrator uses the pool.
  const lockConnection = await db.$client.reserve();
  try {
    await lockConnection`SELECT pg_advisory_lock(${MIGRATION_LOCK_KEY})`;
    await migrate(db, { migrationsFolder });
  } finally {
    try {
      await lockConnection`SELECT pg_advisory_unlock(${MIGRATION_LOCK_KEY})`;
    } finally {
      await lockConnection.release();
    }
  }
};
