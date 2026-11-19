import { Elysia } from "elysia";
import type { Db } from "../../db/client.ts";
import type { Redis } from "../../redis/client.ts";
import { isReady, type Lifecycle } from "./service.ts";

// Unlike /health, which only says the process answers, /ready says whether it can serve: a load
// balancer stops sending it traffic when Postgres or Redis is out of reach, or once it stops.
export const createLifecycleRoutes = (db: Db, redis: Redis, lifecycle: Lifecycle) =>
  new Elysia().get("/ready", async ({ status }) =>
    !lifecycle.isStopping() && (await isReady(db, redis)) ? "ok" : status(503, "unavailable"),
  );
