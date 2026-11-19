import { afterAll, expect, test } from "bun:test";
import { getLogger } from "@repo/logger";
import { createApp } from "../src/app.ts";
import type { RateLimitOptions } from "../src/modules/rate-limit/index.ts";
import type { Redis } from "../src/redis/client.ts";
import { createTestAuth } from "./helpers/auth.ts";
import { createTestDb } from "./helpers/db.ts";
import { createTestRedis } from "./helpers/redis.ts";

const testDb = await createTestDb();

afterAll(() => testDb.drop());

// Two sign-ins a minute, so a third one is refused well within the window.
const createLimitedApp = (redis: Redis, rateLimitOptions?: RateLimitOptions) =>
  createApp(
    testDb.db,
    createTestAuth(testDb.db, {
      redis,
      enabled: true,
      customRules: { "/sign-in/*": { window: 60, max: 2 } },
    }),
    redis,
    getLogger("api"),
    undefined,
    undefined,
    undefined,
    undefined,
    rateLimitOptions,
  );

const startSignIn = (app: ReturnType<typeof createApp>, headers: Record<string, string> = {}) =>
  app.handle(
    new Request("http://localhost/api/auth/sign-in/social", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
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

test("without TRUST_PROXY, a forged X-Forwarded-For does not give a sign-in a count of its own", async () => {
  const testRedis = await createTestRedis();
  const app = createLimitedApp(testRedis.redis);
  const from = (forwardedFor: string) => startSignIn(app, { "x-forwarded-for": forwardedFor });

  expect((await from("203.0.113.1")).status).toBe(200);
  expect((await from("203.0.113.2")).status).toBe(200);
  expect((await from("203.0.113.3")).status).toBe(429);
  await testRedis.drop();
});

test("with TRUST_PROXY, sign-ins are counted against the leftmost X-Forwarded-For address", async () => {
  const testRedis = await createTestRedis();
  const app = createLimitedApp(testRedis.redis, { trustProxy: true });
  const from = (forwardedFor: string) => startSignIn(app, { "x-forwarded-for": forwardedFor });

  expect((await from("203.0.113.1, 10.0.0.1")).status).toBe(200);
  expect((await from("203.0.113.1, 10.0.0.2")).status).toBe(200);
  expect((await from("203.0.113.2, 10.0.0.1")).status).toBe(200);
  expect((await from("203.0.113.1, 10.0.0.1")).status).toBe(429);
  await testRedis.drop();
});
