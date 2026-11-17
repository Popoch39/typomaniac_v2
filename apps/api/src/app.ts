import { Elysia } from "elysia";
import type { Db } from "./db/client.ts";

// The database is injected so tests can run each app against its own throwaway Postgres database.
export const createApp = (db: Db) => new Elysia().decorate("db", db).get("/health", () => "ok");

export type App = ReturnType<typeof createApp>;
