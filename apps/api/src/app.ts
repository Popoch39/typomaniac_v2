import type { Logger } from "@repo/logger";
import { Elysia } from "elysia";
import type { Db } from "./db/client.ts";
import type { Auth } from "./modules/auth/service.ts";
import { createDevRoutes } from "./modules/dev/index.ts";
import type { DevOptions } from "./modules/dev/config.ts";
import { createDuelRoutes, type DuelOptions } from "./modules/duel/index.ts";
import { createLifecycleRoutes } from "./modules/lifecycle/index.ts";
import { createLifecycle, type Lifecycle } from "./modules/lifecycle/service.ts";
import { createOrnamentRoutes } from "./modules/ornament/index.ts";
import { createPlayerRoutes } from "./modules/player/index.ts";
import { createQueueRoutes, type QueueOptions } from "./modules/queue/index.ts";
import { createStandingRoutes } from "./modules/standing/index.ts";
import type { Redis } from "./redis/client.ts";

// The database, the auth instance and Redis are injected so tests can run each app against its own
// throwaway Postgres database and Redis namespace, and the logger so tests can read its records. The Duel and Queue options let a test shorten
// their delays. The dev options stay off unless the entry turns them on. The lifecycle is the entry's
// hold on the instance's stop.
export const createApp = (
  db: Db,
  auth: Auth,
  redis: Redis,
  logger: Logger,
  duelOptions?: DuelOptions,
  queueOptions?: QueueOptions,
  devOptions?: DevOptions,
  lifecycle: Lifecycle = createLifecycle(),
) =>
  new Elysia()
    .decorate("db", db)
    // Mounted without a prefix: Better Auth routes on its own basePath (/api/auth).
    .mount(auth.handler)
    .get("/health", () => "ok")
    .use(createLifecycleRoutes(db, redis, lifecycle))
    .use(createPlayerRoutes(db, auth))
    .use(createOrnamentRoutes(db, auth))
    .use(createStandingRoutes(db, auth))
    .use(createDuelRoutes(db, auth, redis, logger.getChild("duel"), lifecycle, duelOptions))
    .use(
      createQueueRoutes(db, auth, redis, logger.getChild("queue"), lifecycle, {
        duelExpiryMs: duelOptions?.expiryMs,
        duelConnectMs: duelOptions?.connectMs,
        ...queueOptions,
      }),
    )
    .use(createDevRoutes(auth, devOptions));

export type App = ReturnType<typeof createApp>;
