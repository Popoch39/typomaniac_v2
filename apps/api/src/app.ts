import { Elysia } from "elysia";
import type { Db } from "./db/client.ts";
import type { Auth } from "./modules/auth/service.ts";
import { createJoueurRoutes } from "./modules/joueur/index.ts";

// The database and the auth instance are injected so tests can run each app against its own throwaway Postgres database.
export const createApp = (db: Db, auth: Auth) =>
  new Elysia()
    .decorate("db", db)
    // Mounted without a prefix: Better Auth routes on its own basePath (/api/auth).
    .mount(auth.handler)
    .get("/health", () => "ok")
    .use(createJoueurRoutes(db, auth));

export type App = ReturnType<typeof createApp>;
