import { afterAll, expect, test } from "bun:test";
import { createApp } from "../src/app.ts";
import { createTestAuth } from "./helpers/auth.ts";
import { createTestDb } from "./helpers/db.ts";
import { createTestRedis } from "./helpers/redis.ts";

const testDb = await createTestDb();
const testRedis = await createTestRedis();
afterAll(async () => {
  await testRedis.drop();
  await testDb.drop();
});
const app = createApp(testDb.db, createTestAuth(testDb.db), testRedis.redis);

test("health responds ok", async () => {
  const response = await app.handle(new Request("http://localhost/health"));
  expect(response.status).toBe(200);
  expect(await response.text()).toBe("ok");
});

test("Better Auth health responds ok under /api/auth", async () => {
  const response = await app.handle(new Request("http://localhost/api/auth/ok"));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true });
});

test("unknown Better Auth route responds 404", async () => {
  const response = await app.handle(new Request("http://localhost/api/auth/nope"));
  expect(response.status).toBe(404);
});

test("unknown route responds 404", async () => {
  const response = await app.handle(new Request("http://localhost/nope"));
  expect(response.status).toBe(404);
});
