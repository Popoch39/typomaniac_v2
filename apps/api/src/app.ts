import { Elysia } from "elysia";
import type { Auth } from "./auth.ts";
import type { Db } from "./db/client.ts";
import { createProtection } from "./protection.ts";

// The database and the auth instance are injected so tests can run each app against its own throwaway Postgres database.
export const createApp = (db: Db, auth: Auth) =>
  new Elysia()
    .decorate("db", db)
    // Mounted without a prefix: Better Auth routes on its own basePath (/api/auth).
    .mount(auth.handler)
    .use(createProtection(auth))
    .get("/health", () => "ok")
    .get("/api/me", { signedIn: true }, ({ joueur }) => ({ id: joueur.id, pseudo: null }));

export type App = ReturnType<typeof createApp>;
