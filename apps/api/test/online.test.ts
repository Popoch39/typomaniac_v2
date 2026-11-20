import { afterAll, expect, test } from "bun:test";
import { getLogger } from "@repo/logger";
import { createApp, type AppOptions } from "../src/app.ts";
import { createTestAuth, signInPlayer } from "./helpers/auth.ts";
import { createTestDb } from "./helpers/db.ts";
import { createTestRedis } from "./helpers/redis.ts";

const testDb = await createTestDb();
const redisDrops: (() => Promise<void>)[] = [];
afterAll(async () => {
  await Promise.all(redisDrops.map((drop) => drop()));
  await testDb.drop();
});
const auth = createTestAuth(testDb.db);

// Each test counts in its own Redis namespace, so the Players another test pinged are not Online here.
const createOnlineApp = async (options: AppOptions = {}) => {
  const testRedis = await createTestRedis();
  redisDrops.push(testRedis.drop);
  const app = createApp(testDb.db, auth, testRedis.redis, getLogger("api"), options);
  return (cookie?: string) =>
    app.handle(
      new Request("http://localhost/api/online", {
        method: "POST",
        headers: cookie ? { cookie } : {},
      }),
    );
};

test("a Guest who pings is told they are not signed in", async () => {
  const ping = await createOnlineApp();

  const response = await ping();

  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ code: "UNAUTHORIZED" });
});

// signInPlayer gives no Nickname: a Player is Online before choosing one.
test("a Player who pings is told they are the one Player Online", async () => {
  const ping = await createOnlineApp();
  const { cookie } = await signInPlayer(auth);

  const response = await ping(cookie);

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ players: 1 });
});

test("two Players who pinged are both Online", async () => {
  const ping = await createOnlineApp();
  const first = await signInPlayer(auth);
  const second = await signInPlayer(auth);

  await ping(first.cookie);
  const response = await ping(second.cookie);

  expect(await response.json()).toEqual({ players: 2 });
});

test("a Player who pings again, from another tab or later, still counts once", async () => {
  const ping = await createOnlineApp();
  const { cookie } = await signInPlayer(auth);

  await ping(cookie);
  const response = await ping(cookie);

  expect(await response.json()).toEqual({ players: 1 });
});

test("a Player whose last ping is older than the window is no longer Online", async () => {
  const ping = await createOnlineApp({ online: { windowMs: 50 } });
  const gone = await signInPlayer(auth);
  const present = await signInPlayer(auth);

  await ping(gone.cookie);
  await Bun.sleep(100);
  const response = await ping(present.cookie);

  expect(await response.json()).toEqual({ players: 1 });
});
