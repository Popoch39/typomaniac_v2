import { getLogger, setupLogger } from "@repo/logger";
import { createApp } from "./app.ts";
import { migrateDatabase, openDatabase, requireDatabaseUrl } from "./db/client.ts";
import { requireAuthConfig } from "./modules/auth/config.ts";
import { createAuth } from "./modules/auth/service.ts";
import { readDevOptions } from "./modules/dev/config.ts";
import { createLifecycle } from "./modules/lifecycle/service.ts";
import { readTrustProxy } from "./modules/rate-limit/config.ts";
import { openRedis, requireRedisUrl } from "./redis/client.ts";

await setupLogger();
const logger = getLogger("api");

// Resolved from the working directory: inside a compiled binary, import.meta.dir is a virtual path.
const migrationsFolder = process.env.MIGRATIONS_DIR ?? "./drizzle";

// Read before the database is opened so a missing variable fails the boot without touching Postgres.
const authConfig = requireAuthConfig();
const redisUrl = requireRedisUrl();
const devOptions = readDevOptions();

const db = openDatabase(requireDatabaseUrl());
await migrateDatabase(db, migrationsFolder);

const redis = await openRedis(redisUrl);
const lifecycle = createLifecycle();

// Re-exported so Elysia's AOT can discover the app from the process entry.
export const app = createApp(
  db,
  createAuth(db, authConfig, { redis }),
  redis,
  logger,
  undefined,
  undefined,
  devOptions,
  lifecycle,
  { trustProxy: readTrustProxy() },
);

app.listen(Number(process.env.PORT ?? 3000));
logger.info("API listening on port {port}", { port: app.server?.port });

// A stuck connection must never block a deploy.
const SHUTDOWN_DEADLINE_MS = 10_000;

// No Duel is lost: their state is in Redis (ADR 0007), and a Participant whose socket closes with
// 1012 reconnects to another instance and reclaims their seat. The sockets close before `app.stop()`,
// which would otherwise cut them without a close code.
const shutDown = async (signal: string) => {
  if (lifecycle.isStopping()) return;
  lifecycle.beginStopping();
  setTimeout(() => {
    logger.error("Shutdown did not end within {deadlineMs} ms, forcing exit", {
      deadlineMs: SHUTDOWN_DEADLINE_MS,
    });
    process.exit(1);
  }, SHUTDOWN_DEADLINE_MS).unref();
  logger.info("Received {signal}, stopping: /ready now answers 503", { signal });
  const closed = await lifecycle.closeSockets();
  logger.info("Closed {count} socket(s) with 1012", { count: closed });
  await app.stop();
  logger.info("Stopped the app: the Duel sweep finished, Queue refreshes stopped");
  redis.close();
  await db.$client.close();
  logger.info("Closed Redis and Postgres, exiting");
  process.exit(0);
};

for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => {
    shutDown(signal).catch((error: unknown) => {
      logger.error("Shutdown failed", { error });
      process.exit(1);
    });
  });
