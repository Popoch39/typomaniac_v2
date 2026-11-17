import { createApp } from "./app.ts";
import { createAuth, requireAuthConfig } from "./auth.ts";
import { migrateDatabase, openDatabase, requireDatabaseUrl } from "./db/client.ts";

// Resolved from the working directory: inside a compiled binary, import.meta.dir is a virtual path.
const migrationsFolder = process.env.MIGRATIONS_DIR ?? "./drizzle";

// Read before the database is opened so a missing variable fails the boot without touching Postgres.
const authConfig = requireAuthConfig();

const db = openDatabase(requireDatabaseUrl());
await migrateDatabase(db, migrationsFolder);

// Re-exported so Elysia's AOT can discover the app from the process entry.
export const app = createApp(db, createAuth(db, authConfig));

app.listen(Number(process.env.PORT ?? 3000));
