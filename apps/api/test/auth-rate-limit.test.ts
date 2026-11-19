import { afterAll, expect, test } from "bun:test";
import { getLogger } from "@repo/logger";
import { createApp } from "../src/app.ts";
import type { Redis } from "../src/redis/client.ts";
import { createTestAuth } from "./helpers/auth.ts";
import { createTestDb } from "./helpers/db.ts";
import { createTestRedis } from "./helpers/redis.ts";

const testDb = await createTestDb();

afterAll(() => testDb.drop());

// Two sign-ins a minute, so a third one is refused well within the window.
const createLimitedApp = (redis: Redis) =>
  createApp(
    testDb.db,
    createTestAuth(testDb.db, {
      redis,
      enabled: true,
      customRules: { "/sign-in/*": { window: 60, max: 2 } },
    }),
    redis,
    getLogger("api"),
  );

const startSignIn = (app: ReturnType<typeof createApp>) =>
  app.handle(
    new Request("http://localhost/api/auth/sign-in/social", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider: "github", callbackURL: "/" }),
    }),
  );

test("a sign-in beyond the limit is refused with 429", async () => {
  const testRedis = await createTestRedis();
  const app = createLimitedApp(testRedis.redis);

  expect((await startSignIn(app)).status).toBe(200);
  expect((await startSignIn(app)).status).toBe(200);
  expect((await startSignIn(app)).status).toBe(429);
  await testRedis.drop();
});

test("two API instances sharing one Redis share the sign-in count", async () => {
  const testRedis = await createTestRedis();
  const otherRedis = await createTestRedis();
  const first = createLimitedApp(testRedis.redis);
  const second = createLimitedApp(testRedis.redis);
  // Same process, other Redis: proves the count lives in Redis, not in the process.
  const elsewhere = createLimitedApp(otherRedis.redis);

  expect((await startSignIn(first)).status).toBe(200);
  expect((await startSignIn(first)).status).toBe(200);
  expect((await startSignIn(second)).status).toBe(429);
  expect((await startSignIn(elsewhere)).status).toBe(200);
  await testRedis.drop();
  await otherRedis.drop();
});
