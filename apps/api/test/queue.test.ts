import { afterAll, expect, test } from "bun:test";
import type { QueueServerMessage } from "@repo/matchmaking-engine";
import { getLogger } from "@repo/logger";
import { createApp } from "../src/app.ts";
import { createLifecycle } from "../src/modules/lifecycle/service.ts";
import { readQueueEntry } from "../src/modules/queue/service.ts";
import { saveStanding } from "../src/modules/standing/service.ts";
import { createTestAuth, signInPlayer, signInPlayerWithNickname } from "./helpers/auth.ts";
import { createTestDb } from "./helpers/db.ts";
import { createTestRedis } from "./helpers/redis.ts";
import { openSocketOf, requestUpgrade } from "./helpers/socket.ts";

const testDb = await createTestDb();
const testRedis = await createTestRedis();
const auth = createTestAuth(testDb.db);
const app = createApp(testDb.db, auth, testRedis.redis, getLogger("api")).listen(0);
const origin = `http://localhost:${app.server?.port}`;
afterAll(async () => {
  await app.stop(true);
  await testRedis.drop();
  await testDb.drop();
});

const queueSocketUrl = (from = origin) => `${from.replace(/^http/, "ws")}/api/queue/socket`;
const openQueueSocket = (cookie: string, from = origin) =>
  openSocketOf<QueueServerMessage, never>(queueSocketUrl(from), cookie);

const readQueue = (cookie?: string, from = origin) =>
  fetch(`${from}/api/queue`, { headers: cookie ? { cookie } : {} });
const queuedAtOf = async (cookie: string, from = origin) => {
  const body = (await (await readQueue(cookie, from)).json()) as { queuedAt: number | null };
  return body.queuedAt;
};
// Leaving follows the close of the socket, which the server learns of a moment later.
const hasLeft = async (cookie: string) => {
  for (let attempt = 0; attempt < 100; attempt++) {
    if ((await queuedAtOf(cookie)) === null) return true;
    await Bun.sleep(10);
  }
  return false;
};

// An instance whose sockets a test closes with 1012, as its stop does.
const startStoppingInstance = (queueOptions?: { entryExpiryMs: number }) => {
  const lifecycle = createLifecycle();
  const app = createApp(testDb.db, auth, testRedis.redis, getLogger("api"), {
    queue: queueOptions,
    lifecycle,
  }).listen(0);
  return { app, lifecycle, origin: `http://localhost:${app.server?.port}` };
};

test("a Player in the Queue keeps their place when their instance restarts and they reconnect to another one", async () => {
  const stopping = startStoppingInstance();
  const { cookie } = await signInPlayerWithNickname(auth, origin);
  const first = await openQueueSocket(cookie, stopping.origin);
  const entered = await first.next();
  if (entered.type !== "queued") throw new Error(`Expected queued, got ${entered.type}`);

  stopping.lifecycle.beginStopping();
  await stopping.lifecycle.closeSockets();
  expect(await first.closed).toBe(1012);
  await stopping.app.stop(true);
  expect(await queuedAtOf(cookie)).toBe(entered.queuedAt);
  const again = await openQueueSocket(cookie);

  expect(await again.next()).toMatchObject({ type: "queued", queuedAt: entered.queuedAt });
  again.close();
  expect(await hasLeft(cookie)).toBe(true);
});

test("a Player whose connection dropped reclaims their place, with their instant of entry, on reconnecting", async () => {
  const { cookie } = await signInPlayerWithNickname(auth, origin);
  const first = await openQueueSocket(cookie);
  const entered = await first.next();
  if (entered.type !== "queued") throw new Error(`Expected queued, got ${entered.type}`);

  first.drop();
  await first.closed;
  await Bun.sleep(50);
  expect(await queuedAtOf(cookie)).toBe(entered.queuedAt);
  const again = await openQueueSocket(cookie);

  expect(await again.next()).toMatchObject({ type: "queued", queuedAt: entered.queuedAt });
  again.close();
  expect(await hasLeft(cookie)).toBe(true);
});

test("a Player whose socket closed with 1012 and who does not come back in time leaves the Queue", async () => {
  const stopping = startStoppingInstance({ entryExpiryMs: 150 });
  const { cookie } = await signInPlayerWithNickname(auth, origin);
  const socket = await openQueueSocket(cookie, stopping.origin);
  await socket.next();

  stopping.lifecycle.beginStopping();
  await stopping.lifecycle.closeSockets();
  await stopping.app.stop(true);
  expect(await queuedAtOf(cookie)).not.toBeNull();
  await Bun.sleep(300);

  expect(await queuedAtOf(cookie)).toBeNull();
});

test("a Player with a Nickname who opens the Queue socket is told they are queued, with their instant of entry", async () => {
  const { cookie } = await signInPlayerWithNickname(auth, origin);
  const before = Date.now();

  const socket = await openQueueSocket(cookie);
  const message = await socket.next();
  const after = Date.now();

  if (message.type !== "queued") throw new Error(`Expected queued, got ${message.type}`);
  expect(message.queuedAt).toBeGreaterThanOrEqual(before);
  expect(message.queuedAt).toBeLessThanOrEqual(after);
  expect(message.serverAt).toBeGreaterThanOrEqual(message.queuedAt);
  expect(message.serverAt).toBeLessThanOrEqual(after);
  socket.close();
});

test("a Player reads over HTTP whether they are queued, and since when", async () => {
  const { cookie } = await signInPlayerWithNickname(auth, origin);
  expect(await queuedAtOf(cookie)).toBeNull();

  const socket = await openQueueSocket(cookie);
  const message = await socket.next();

  if (message.type !== "queued") throw new Error(`Expected queued, got ${message.type}`);
  expect(await queuedAtOf(cookie)).toBe(message.queuedAt);
  socket.close();
});

test("a Guest is refused the Queue socket, and the HTTP route says they are not signed in", async () => {
  const upgrade = await requestUpgrade(queueSocketUrl());
  expect(upgrade.status).toBe(401);
  expect(await upgrade.json()).toEqual({ code: "UNAUTHORIZED" });

  const reason = await readQueue();
  expect(reason.status).toBe(401);
  expect(await reason.json()).toEqual({ code: "UNAUTHORIZED" });
});

test("a Player without a Nickname is refused the Queue socket, and the HTTP route says a Nickname is required", async () => {
  const { player, cookie } = await signInPlayer(auth);

  const upgrade = await requestUpgrade(queueSocketUrl(), cookie);
  expect(upgrade.status).toBe(403);
  expect(await upgrade.json()).toEqual({ code: "NICKNAME_REQUIRED" });

  const reason = await readQueue(cookie);
  expect(reason.status).toBe(403);
  expect(await reason.json()).toEqual({ code: "NICKNAME_REQUIRED" });
  expect(await readQueueEntry(testRedis.redis, player.id)).toBeNull();
});

test("a plain request to the Queue socket queues nobody", async () => {
  const { cookie } = await signInPlayerWithNickname(auth, origin);

  const response = await fetch(`${origin}/api/queue/socket`, { headers: { cookie } });

  expect(response.ok).toBe(false);
  expect(await queuedAtOf(cookie)).toBeNull();
});

test("closing the socket takes the Player out of the Queue", async () => {
  const { cookie } = await signInPlayerWithNickname(auth, origin);
  const socket = await openQueueSocket(cookie);
  await socket.next();

  socket.close();

  expect(await hasLeft(cookie)).toBe(true);
});

// Each socket is closed by the client as soon as it opens, while the server is still awaiting Redis
// in its open. The close only sometimes lands there, so several Players race it, each on their own.
test("Players whose socket closes while it is still opening are not left in the Queue", async () => {
  const closeOnOpen = async () => {
    const { cookie } = await signInPlayerWithNickname(auth, origin);
    const socket = new WebSocket(queueSocketUrl(), { headers: { cookie } });
    socket.addEventListener("open", () => socket.close(), { once: true });
    await new Promise((resolve) => socket.addEventListener("close", resolve, { once: true }));
    return cookie;
  };
  const cookies = await Promise.all(Array.from({ length: 5 }, closeOnOpen));

  for (const cookie of cookies) expect(await hasLeft(cookie)).toBe(true);
});

test("a Player enters the Queue with the MMR of their Standing", async () => {
  const { player, cookie } = await signInPlayerWithNickname(auth, origin);
  await saveStanding(testDb.db, player.id, {
    mmr: 1337,
    duelsPlayed: 42,
    rank: { tier: "gold", division: 2, lp: 45 },
  });

  const socket = await openQueueSocket(cookie);
  const message = await socket.next();

  if (message.type !== "queued") throw new Error(`Expected queued, got ${message.type}`);
  expect(await readQueueEntry(testRedis.redis, player.id)).toEqual({
    mmr: 1337,
    queuedAt: message.queuedAt,
  });
  socket.close();
});

test("a Player who never played ranked enters the Queue with the MMR of a new Player", async () => {
  const { player, cookie } = await signInPlayerWithNickname(auth, origin);

  const socket = await openQueueSocket(cookie);
  await socket.next();

  expect((await readQueueEntry(testRedis.redis, player.id))?.mmr).toBe(1200);
  socket.close();
});

test("a second socket of the same Player evicts the first, which is told and closed, and keeps their place", async () => {
  const { cookie } = await signInPlayerWithNickname(auth, origin);
  const first = await openQueueSocket(cookie);
  const entered = await first.next();
  if (entered.type !== "queued") throw new Error(`Expected queued, got ${entered.type}`);

  const second = await openQueueSocket(cookie);

  expect(await first.next()).toEqual({ type: "removed", reason: "replaced" });
  await first.closed;
  expect(await second.next()).toMatchObject({ type: "queued", queuedAt: entered.queuedAt });
  // The evicted socket's close must not take out the Player its successor keeps queued.
  await Bun.sleep(50);
  expect(await queuedAtOf(cookie)).toBe(entered.queuedAt);
  expect(await second.staysSilent(50)).toBe(true);
  second.close();
  expect(await hasLeft(cookie)).toBe(true);
});

test("a second socket on another API instance evicts the first", async () => {
  const other = createApp(testDb.db, auth, testRedis.redis, getLogger("api")).listen(0);
  const otherOrigin = `http://localhost:${other.server?.port}`;
  const { cookie } = await signInPlayerWithNickname(auth, origin);
  const first = await openQueueSocket(cookie);
  const entered = await first.next();
  if (entered.type !== "queued") throw new Error(`Expected queued, got ${entered.type}`);

  const second = await openQueueSocket(cookie, otherOrigin);

  expect(await first.next()).toEqual({ type: "removed", reason: "replaced" });
  await first.closed;
  expect(await second.next()).toMatchObject({ type: "queued", queuedAt: entered.queuedAt });
  await Bun.sleep(50);
  expect(await queuedAtOf(cookie)).toBe(entered.queuedAt);
  second.close();
  expect(await hasLeft(cookie)).toBe(true);
  await other.stop(true);
});

test("two Players are queued side by side: one entering evicts nobody else", async () => {
  const ada = await signInPlayerWithNickname(auth, origin);
  const bob = await signInPlayerWithNickname(auth, origin);
  const adaSocket = await openQueueSocket(ada.cookie);
  await adaSocket.next();

  const bobSocket = await openQueueSocket(bob.cookie);
  await bobSocket.next();

  expect(await adaSocket.staysSilent(50)).toBe(true);
  expect(await queuedAtOf(ada.cookie)).not.toBeNull();
  adaSocket.close();
  bobSocket.close();
});

test("the Queue entry of a Player whose API instance stopped refreshing it expires on its own", async () => {
  // An instance that never refreshes in time stands for one that crashed with the socket open.
  const stalled = createApp(testDb.db, auth, testRedis.redis, getLogger("api"), {
    queue: { entryExpiryMs: 150, refreshMs: 60_000 },
  }).listen(0);
  const { cookie } = await signInPlayerWithNickname(auth, origin);
  const socket = await openQueueSocket(cookie, `http://localhost:${stalled.server?.port}`);
  await socket.next();
  expect(await queuedAtOf(cookie)).not.toBeNull();

  await Bun.sleep(300);

  expect(await queuedAtOf(cookie)).toBeNull();
  socket.close();
  await stalled.stop(true);
});

test("a queued Player stays queued past the expiry while their API instance holds their socket", async () => {
  const lively = createApp(testDb.db, auth, testRedis.redis, getLogger("api"), {
    queue: { entryExpiryMs: 150 },
  }).listen(0);
  const { cookie } = await signInPlayerWithNickname(auth, origin);
  const socket = await openQueueSocket(cookie, `http://localhost:${lively.server?.port}`);
  const entered = await socket.next();
  if (entered.type !== "queued") throw new Error(`Expected queued, got ${entered.type}`);

  await Bun.sleep(450);

  expect(await queuedAtOf(cookie)).toBe(entered.queuedAt);
  socket.close();
  await lively.stop(true);
});
