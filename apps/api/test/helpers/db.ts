import { join } from "node:path";
import { SQL } from "bun";
import { migrateDatabase, openDatabase, requireDatabaseUrl } from "../../src/db/client.ts";

const migrationsFolder = join(import.meta.dir, "../../drizzle");

// Each caller gets its own freshly migrated database, so test files never share rows.
export const createTestDb = async () => {
  const serverUrl = requireDatabaseUrl();
  const name = `test_${crypto.randomUUID().replaceAll("-", "")}`;
  const admin = new SQL(serverUrl);
  await admin`CREATE DATABASE ${admin(name)}`;

  const url = new URL(serverUrl);
  url.pathname = `/${name}`;
  const db = openDatabase(url.href);
  await migrateDatabase(db, migrationsFolder);

  const drop = async () => {
    await db.$client.close();
    await admin`DROP DATABASE ${admin(name)}`;
    await admin.close();
  };
  return { db, drop };
};
