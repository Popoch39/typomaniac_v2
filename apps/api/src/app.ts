import { Elysia } from "elysia";
import type { Db } from "./db/client.ts";
import type { Auth } from "./modules/auth/service.ts";
import { createDuelRoutes, type DuelOptions } from "./modules/duel/index.ts";
import { createPlayerRoutes } from "./modules/player/index.ts";
import type { Redis } from "./redis/client.ts";

// The database, the auth instance and Redis are injected so tests can run each app against its own
// throwaway Postgres database and Redis namespace. The Duel options let a test shorten the expiry.
export const createApp = (db: Db, auth: Auth, redis: Redis, duelOptions?: DuelOptions) =>
  new Elysia()
    .decorate("db", db)
    // Mounted without a prefix: Better Auth routes on its own basePath (/api/auth).
    .mount(auth.handler)
    .get("/health", () => "ok")
    .use(createPlayerRoutes(db, auth))
    .use(createDuelRoutes(auth, redis, duelOptions));

export type App = ReturnType<typeof createApp>;
