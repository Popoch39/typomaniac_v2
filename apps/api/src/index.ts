import { createApp } from "./app.ts";
import { migrateDatabase, openDatabase, requireDatabaseUrl } from "./db/client.ts";

// Resolved from the working directory: inside a compiled binary, import.meta.dir is a virtual path.
const migrationsFolder = process.env.MIGRATIONS_DIR ?? "./drizzle";

const db = openDatabase(requireDatabaseUrl());
await migrateDatabase(db, migrationsFolder);

// Re-exported so Elysia's AOT can discover the app from the process entry.
export const app = createApp(db);

app.listen(Number(process.env.PORT ?? 3000));
