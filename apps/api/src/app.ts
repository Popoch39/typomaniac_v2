import type { ApiModule, Logger } from "@repo/logger";
import { Elysia } from "elysia";
import type { Db } from "./db/client.ts";
import { createAdministrationRoutes } from "./modules/administration/index.ts";
import { createAuthRoutes, createProtection } from "./modules/auth/index.ts";
import type { Auth } from "./modules/auth/service.ts";
import { createDevRoutes } from "./modules/dev/index.ts";
import type { DevOptions } from "./modules/dev/config.ts";
import { createDuelRoutes, type DuelOptions } from "./modules/duel/index.ts";
import type { FairPlayConfig } from "./modules/fair-play/config.ts";
import { createFairPlayRoutes } from "./modules/fair-play/index.ts";
import { createFriendRoutes } from "./modules/friend/index.ts";
import { createRequestLog } from "./modules/http/index.ts";
import { createLifecycleRoutes } from "./modules/lifecycle/index.ts";
import { createLifecycle, type Lifecycle } from "./modules/lifecycle/service.ts";
import { createOnlineRoutes, type OnlineOptions } from "./modules/online/index.ts";
import { cancelChallengesBetween, pushToPlayer } from "./modules/online/service.ts";
import { createOrnamentRoutes } from "./modules/ornament/index.ts";
import { createPlayerRoutes } from "./modules/player/index.ts";
import { createProgressRoutes } from "./modules/progress/index.ts";
import { createQueueRoutes, type QueueOptions } from "./modules/queue/index.ts";
import { createRateLimiter, type RateLimitOptions } from "./modules/rate-limit/index.ts";
import { createReportRoutes } from "./modules/report/index.ts";
import { createStandingRoutes } from "./modules/standing/index.ts";
import type { Redis } from "./redis/client.ts";

export type AppOptions = {
  /** Lets a test shorten the Duel delays. */
  readonly duel?: DuelOptions;
  /** Lets a test shorten the Queue delays. */
  readonly queue?: QueueOptions;
  /** Off unless the entry turns them on. */
  readonly dev?: DevOptions;
  /** The entry's hold on the instance's stop; a new one by default. */
  readonly lifecycle?: Lifecycle;
  /** Lets a test lower the limits, and says whether the API sits behind a proxy. */
  readonly rateLimit?: RateLimitOptions;
  /** The entry reads it from the configuration; a test that shows no Sanction may leave it out. */
  readonly fairPlay?: FairPlayConfig;
  /** Lets a test shorten how long a Player stays Online after their sockets. */
  readonly online?: OnlineOptions;
};

// Never shown outside tests: the entry refuses to start without a configured address.
const UNCONFIGURED_FAIR_PLAY: FairPlayConfig = { appealAddress: "fair-play@example.invalid" };

// The database, the auth instance and Redis are injected so tests can run each app against its own
// throwaway Postgres database and Redis namespace, and the logger so tests can read its records.
export const createApp = (
  db: Db,
  auth: Auth,
  redis: Redis,
  logger: Logger,
  {
    duel: duelOptions,
    queue: queueOptions,
    dev: devOptions,
    lifecycle = createLifecycle(),
    rateLimit: rateLimitOptions,
    fairPlay = UNCONFIGURED_FAIR_PLAY,
    online: onlineOptions,
  }: AppOptions = {},
) => {
  // Only the categories `@repo/logger` names.
  const loggerOf = (module: ApiModule) => logger.getChild(module);
  const rateLimiter = createRateLimiter(redis, loggerOf("rate-limit"), rateLimitOptions);
  const protection = createProtection(auth, rateLimiter);
  return (
    new Elysia()
      // First, so that its hooks reach every route after it.
      .use(createRequestLog(loggerOf("http")))
      .decorate("db", db)
      .use(createAuthRoutes(auth, rateLimiter))
      .get("/health", () => "ok")
      .use(createLifecycleRoutes(db, redis, lifecycle))
      .use(createPlayerRoutes(db, protection, rateLimiter))
      .use(createOrnamentRoutes(db, protection))
      .use(createStandingRoutes(db, auth, protection))
      .use(createProgressRoutes(db, protection))
      .use(createFairPlayRoutes(db, protection, fairPlay))
      .use(createReportRoutes(db, protection, rateLimiter))
      .use(createAdministrationRoutes(db, protection))
      .use(
        createFriendRoutes(db, protection, rateLimiter, {
          push: (playerId, message) => pushToPlayer(redis, playerId, message),
          cancelChallengesBetween: (playerId, otherId) =>
            cancelChallengesBetween(redis, playerId, otherId),
        }),
      )
      .use(
        createOnlineRoutes(db, protection, rateLimiter, redis, loggerOf("online"), lifecycle, {
          duelExpiryMs: duelOptions?.expiryMs,
          ...onlineOptions,
        }),
      )
      .use(
        createDuelRoutes(
          db,
          protection,
          rateLimiter,
          redis,
          loggerOf("duel"),
          lifecycle,
          duelOptions,
        ),
      )
      .use(
        createQueueRoutes(db, protection, rateLimiter, redis, loggerOf("queue"), lifecycle, {
          duelExpiryMs: duelOptions?.expiryMs,
          duelConnectMs: duelOptions?.connectMs,
          ...queueOptions,
        }),
      )
      .use(createDevRoutes(auth, devOptions))
  );
};

export type App = ReturnType<typeof createApp>;
