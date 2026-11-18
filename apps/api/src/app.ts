import { Elysia } from "elysia";
import type { Db } from "./db/client.ts";
import type { Auth } from "./modules/auth/service.ts";
import { createDuelRoutes, type DuelOptions } from "./modules/duel/index.ts";
import { createPlayerRoutes } from "./modules/player/index.ts";
import { createQueueRoutes, type QueueOptions } from "./modules/queue/index.ts";
import { createStandingRoutes } from "./modules/standing/index.ts";
import type { Redis } from "./redis/client.ts";

// The database, the auth instance and Redis are injected so tests can run each app against its own
// throwaway Postgres database and Redis namespace. The Duel and Queue options let a test shorten
// their delays.
export const createApp = (
  db: Db,
  auth: Auth,
  redis: Redis,
  duelOptions?: DuelOptions,
  queueOptions?: QueueOptions,
) =>
  new Elysia()
    .decorate("db", db)
    // Mounted without a prefix: Better Auth routes on its own basePath (/api/auth).
    .mount(auth.handler)
    .get("/health", () => "ok")
    .use(createPlayerRoutes(db, auth))
    .use(createStandingRoutes(db, auth))
    .use(createDuelRoutes(db, auth, redis, duelOptions))
    .use(
      createQueueRoutes(db, auth, redis, {
        duelExpiryMs: duelOptions?.expiryMs,
        duelConnectMs: duelOptions?.connectMs,
        ...queueOptions,
      }),
    );

export type App = ReturnType<typeof createApp>;
