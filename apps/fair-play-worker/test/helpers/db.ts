import { join } from "node:path";
import { migrateDatabase, openDatabase, requireDatabaseUrl } from "@repo/db";
import { SQL } from "bun";

// The worker never migrates (ADR 0002): its test databases are migrated as the API migrates its own.
const migrationsFolder = join(import.meta.dir, "../../../api/drizzle");

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
    await admin`DROP DATABASE ${admin(name)} WITH (FORCE)`;
    await admin.close();
  };
  return { db, url: url.href, drop };
};
