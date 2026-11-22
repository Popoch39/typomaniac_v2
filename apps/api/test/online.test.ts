import { afterAll, expect, test } from "bun:test";
import { getLogger } from "@repo/logger";
import { createApp, type AppOptions } from "../src/app.ts";
import { createLifecycle } from "../src/modules/lifecycle/service.ts";
import type { Redis } from "../src/redis/client.ts";
import { createTestAuth, signInPlayer } from "./helpers/auth.ts";
import { createTestDb } from "./helpers/db.ts";
import { createTestRedis } from "./helpers/redis.ts";
import { openSocketOf, requestUpgrade } from "./helpers/socket.ts";

const testDb = await createTestDb();
const auth = createTestAuth(testDb.db);
const cleanups: (() => Promise<void>)[] = [];
afterAll(async () => {
  for (const cleanup of cleanups.reverse()) await cleanup();
  await testDb.drop();
});

type PlayerServerMessage = { type: "onlineCount"; count: number };

// Each test counts in its own Redis namespace, so the Players of another test are not Online here.
const createRedis = async () => {
  const testRedis = await createTestRedis();
  cleanups.push(testRedis.drop);
  return testRedis.redis;
};

// Listening on an ephemeral port: the in-process request seam cannot upgrade a connection.
const startInstance = (redis: Redis, options: AppOptions = {}) => {
  const app = createApp(testDb.db, auth, redis, getLogger("api"), options).listen(0);
  cleanups.push(async () => {
    await app.stop(true);
  });
  const origin = `http://localhost:${app.server?.port}`;
  const url = `${origin.replace(/^http/, "ws")}/api/online/socket`;
  return {
    origin,
    url,
    open: (cookie: string) => openSocketOf<PlayerServerMessage, unknown>(url, cookie),
  };
};

test("a Guest's upgrade to the Player socket is refused with 401", async () => {
  const { url } = startInstance(await createRedis());

  const response = await requestUpgrade(url);

  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ code: "UNAUTHORIZED" });
});

// signInPlayer gives no Nickname: a Player is Online before choosing one.
test("a Player without a Nickname opens the socket and is told they are the one Player Online", async () => {
  const instance = startInstance(await createRedis());
  const { cookie } = await signInPlayer(auth);

  const socket = await instance.open(cookie);

  expect(await socket.next()).toEqual({ type: "onlineCount", count: 1 });
  socket.close();
});

test("a Player who opens the socket is counted, and the count is pushed to the sockets already open", async () => {
  const instance = startInstance(await createRedis());
  const first = await instance.open((await signInPlayer(auth)).cookie);
  await first.next();

  const second = await instance.open((await signInPlayer(auth)).cookie);

  expect(await second.next()).toEqual({ type: "onlineCount", count: 2 });
  expect(await first.next()).toEqual({ type: "onlineCount", count: 2 });
  first.close();
  second.close();
});

test("two tabs of one Player count once, and the first tab is told nothing new", async () => {
  const instance = startInstance(await createRedis());
  const { cookie } = await signInPlayer(auth);
  const firstTab = await instance.open(cookie);
  await firstTab.next();

  const secondTab = await instance.open(cookie);

  expect(await secondTab.next()).toEqual({ type: "onlineCount", count: 1 });
  expect(await firstTab.staysSilent(100)).toBe(true);
  firstTab.close();
  secondTab.close();
});

// The window is shortened, as a browser slows a background tab's timers far beyond it: the socket
// sends nothing, and its Player stays Online.
test("a Player whose tabs send nothing for longer than the window stays Online, even after closing one of them", async () => {
  const instance = startInstance(await createRedis(), { online: { windowMs: 150 } });
  const { cookie } = await signInPlayer(auth);
  const firstTab = await instance.open(cookie);
  const secondTab = await instance.open(cookie);
  await Promise.all([firstTab.next(), secondTab.next()]);

  firstTab.close();
  await Bun.sleep(400);
  const other = await instance.open((await signInPlayer(auth)).cookie);

  expect(await other.next()).toEqual({ type: "onlineCount", count: 2 });
  secondTab.close();
  other.close();
});

test("a Player who closed all their tabs leaves the count after the window, and the sockets still open are told", async () => {
  const instance = startInstance(await createRedis(), { online: { windowMs: 150 } });
  const { cookie } = await signInPlayer(auth);
  const firstTab = await instance.open(cookie);
  const secondTab = await instance.open(cookie);
  await Promise.all([firstTab.next(), secondTab.next()]);
  const staying = await instance.open((await signInPlayer(auth)).cookie);
  await staying.next();

  firstTab.close();
  secondTab.close();

  expect(await staying.next()).toEqual({ type: "onlineCount", count: 1 });
  staying.close();
});

test("Players whose sockets sit on two instances are counted together, and each instance pushes the count", async () => {
  const redis = await createRedis();
  const one = startInstance(redis);
  const other = startInstance(redis);
  const first = await one.open((await signInPlayer(auth)).cookie);
  await first.next();

  const second = await other.open((await signInPlayer(auth)).cookie);

  expect(await second.next()).toEqual({ type: "onlineCount", count: 2 });
  expect(await first.next()).toEqual({ type: "onlineCount", count: 2 });
  first.close();
  second.close();
});

test("the Player sockets of a stopping instance are closed with 1012, and one opening meanwhile is closed at once", async () => {
  const lifecycle = createLifecycle();
  const instance = startInstance(await createRedis(), { lifecycle });
  const { cookie } = await signInPlayer(auth);
  const socket = await instance.open(cookie);
  await socket.next();

  lifecycle.beginStopping();
  await lifecycle.closeSockets();
  const late = await instance.open(cookie);

  expect(await socket.closed).toBe(1012);
  expect(await late.closed).toBe(1012);
});

test("upgrades to the Player socket beyond the limit are refused with 429", async () => {
  const instance = startInstance(await createRedis(), {
    rateLimit: { limits: { playerSocket: { max: 2, windowSeconds: 60 } } },
  });
  const { cookie } = await signInPlayer(auth);
  for (let opened = 0; opened < 2; opened++) {
    const socket = await instance.open(cookie);
    await socket.next();
    socket.close();
    await socket.closed;
  }

  const response = await requestUpgrade(instance.url, cookie);

  expect(response.status).toBe(429);
  expect(await response.json()).toEqual({ code: "RATE_LIMITED" });
  expect(Number(response.headers.get("retry-after"))).toBeGreaterThanOrEqual(1);
});

test("a Player socket flooding past the message cap is closed with 1008", async () => {
  const instance = startInstance(await createRedis(), {
    rateLimit: { socketMessages: { max: 3, windowSeconds: 60 } },
  });
  const socket = await instance.open((await signInPlayer(auth)).cookie);
  await socket.next();

  for (let sent = 0; sent < 10; sent++) socket.send({ type: "anything" });

  expect(await socket.closed).toBe(1008);
});

test("the Online ping route is gone: a Player is Online through the socket only", async () => {
  const instance = startInstance(await createRedis());
  const { cookie } = await signInPlayer(auth);

  const response = await fetch(`${instance.origin}/api/online`, {
    method: "POST",
    headers: { cookie },
  });

  expect(response.status).toBe(404);
});
