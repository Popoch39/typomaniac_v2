import { cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SQL } from "bun";
import { migrateDatabase, openDatabase, requireDatabaseUrl } from "../../src/db/client.ts";

const migrationsFolder = join(import.meta.dir, "../../drizzle");

// Each caller gets its own freshly migrated database, so test files never share rows. Another
// folder of migrations gives a database as an earlier version of the API left it.
export const createTestDb = async (folder = migrationsFolder) => {
  const serverUrl = requireDatabaseUrl();
  const name = `test_${crypto.randomUUID().replaceAll("-", "")}`;
  const admin = new SQL(serverUrl);
  await admin`CREATE DATABASE ${admin(name)}`;

  const url = new URL(serverUrl);
  url.pathname = `/${name}`;
  const db = openDatabase(url.href);
  await migrateDatabase(db, folder);

  const drop = async () => {
    await db.$client.close();
    await admin`DROP DATABASE ${admin(name)}`;
    await admin.close();
  };
  return { db, drop };
};

type Journal = { entries: { idx: number; tag: string }[] };

// The migrations up to the one numbered `last`, as they were before a later change.
export const migrationsUpTo = async (last: number) => {
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
