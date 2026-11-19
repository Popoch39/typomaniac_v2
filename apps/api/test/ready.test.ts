import { afterAll, expect, test } from "bun:test";
import { getLogger } from "@repo/logger";
import { createApp } from "../src/app.ts";
import { type Db, openDatabase } from "../src/db/client.ts";
import { createLifecycle, type Lifecycle } from "../src/modules/lifecycle/service.ts";
import type { Redis } from "../src/redis/client.ts";
import { createTestAuth } from "./helpers/auth.ts";
import { createTestDb } from "./helpers/db.ts";
import { createTestRedis } from "./helpers/redis.ts";

const testDb = await createTestDb();
const testRedis = await createTestRedis();
const auth = createTestAuth(testDb.db);
// Closed before any test: a Redis that no longer answers.
const closedRedis = await createTestRedis();
await closedRedis.drop();
// Nothing listens there: Postgres refuses the connection.
const refusingDb = openDatabase("postgres://nobody:nothing@127.0.0.1:9/none");
// Accepts the connection and never answers: a Postgres that hangs.
const silentServer = Bun.listen({ hostname: "127.0.0.1", port: 0, socket: { data() {} } });
const hangingDb = openDatabase(`postgres://nobody:nothing@127.0.0.1:${silentServer.port}/none`);
afterAll(async () => {
  await hangingDb.$client.close({ timeout: 0 });
  await refusingDb.$client.close({ timeout: 0 });
  silentServer.stop(true);
  await testRedis.drop();
  await testDb.drop();
});

const appWith = (db: Db, redis: Redis, lifecycle?: Lifecycle) =>
  createApp(db, auth, redis, getLogger("api"), { lifecycle });

const ready = (app: ReturnType<typeof appWith>) =>
  app.handle(new Request("http://localhost/ready"));

test("readiness answers 200 when Postgres and Redis both answer", async () => {
  const response = await ready(appWith(testDb.db, testRedis.redis));
  expect(response.status).toBe(200);
});

test("readiness answers 503 when Redis does not answer", async () => {
  const response = await ready(appWith(testDb.db, closedRedis.redis));
  expect(response.status).toBe(503);
});

test("readiness answers 503 when Postgres refuses the connection", async () => {
  const response = await ready(appWith(refusingDb, testRedis.redis));
  expect(response.status).toBe(503);
});

test("readiness answers 503 within its timeout when Postgres never answers", async () => {
  const startedAt = Date.now();
  const response = await ready(appWith(hangingDb, testRedis.redis));
  expect(response.status).toBe(503);
  expect(Date.now() - startedAt).toBeLessThan(3000);
});

test("once the instance is stopping, readiness answers 503 while liveness still answers 200", async () => {
  const lifecycle = createLifecycle();
  const app = appWith(testDb.db, testRedis.redis, lifecycle);
  lifecycle.beginStopping();

  expect((await ready(app)).status).toBe(503);
  expect((await app.handle(new Request("http://localhost/health"))).status).toBe(200);
});
