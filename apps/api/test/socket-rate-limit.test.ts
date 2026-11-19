import { afterAll, expect, test } from "bun:test";
import type { ServerMessage } from "@repo/duel-engine";
import type { QueueServerMessage } from "@repo/matchmaking-engine";
import { getLogger, type LogRecord, resetLogger, setupLogger } from "@repo/logger";
import { createApp } from "../src/app.ts";
import type { RateLimitOptions } from "../src/modules/rate-limit/index.ts";
import type { Redis } from "../src/redis/client.ts";
import { createTestAuth, signInPlayerWithNickname } from "./helpers/auth.ts";
import { createTestDb } from "./helpers/db.ts";
import { createTestRedis } from "./helpers/redis.ts";
import { openSocket, openSocketOf, requestUpgrade } from "./helpers/socket.ts";

const testDb = await createTestDb();
const auth = createTestAuth(testDb.db);
const records: LogRecord[] = [];
await setupLogger({ sink: (record) => void records.push(record) });
afterAll(async () => {
  await resetLogger();
  await testDb.drop();
});

// Listening on an ephemeral port: the in-process request seam cannot upgrade a connection.
const listenWith = (redis: Redis, rateLimitOptions: RateLimitOptions) => {
  const app = createApp(testDb.db, auth, redis, getLogger("api"), {
    duel: { countdownMs: 0 },
    rateLimit: rateLimitOptions,
  }).listen(0);
  const origin = `http://localhost:${app.server?.port}`;
  return { origin, socketOrigin: origin.replace(/^http/, "ws"), stop: () => app.stop(true) };
};

// Each test counts in a Redis namespace of its own, so no test inherits another's counts.
const withRedis = async (run: (redis: Redis) => Promise<void>) => {
  const testRedis = await createTestRedis();
  try {
    await run(testRedis.redis);
  } finally {
    await testRedis.drop();
  }
};

const twoPerMinute = { max: 2, windowSeconds: 60 };

const createDuel = async (origin: string, cookie: string) => {
  const response = await fetch(`${origin}/api/duels`, { method: "POST", headers: { cookie } });
  return ((await response.json()) as { id: string }).id;
};

const expectRateLimited = async (response: Response) => {
  expect(response.status).toBe(429);
  expect(await response.json()).toEqual({ code: "RATE_LIMITED" });
  const retryAfter = Number(response.headers.get("retry-after"));
  expect(retryAfter).toBeGreaterThanOrEqual(1);
  expect(retryAfter).toBeLessThanOrEqual(60);
};

const warningsFor = (key: string) =>
  records.filter(({ level, properties }) => level === "warning" && properties.key === key);

test("upgrades to a Duel socket beyond the limit are refused with 429 before the seat is claimed, and logged", async () => {
  await withRedis(async (redis) => {
    const { origin, socketOrigin, stop } = listenWith(redis, {
      limits: { duelSocket: twoPerMinute },
    });
    const { player, cookie } = await signInPlayerWithNickname(auth, origin);
    const id = await createDuel(origin, cookie);
    const url = `${socketOrigin}/api/duels/${id}/socket`;

    for (let opened = 0; opened < 2; opened++) {
      const socket = await openSocket(url, cookie);
      expect(await socket.next()).toMatchObject({ type: "state", seat: 0 });
      socket.close();
      await socket.closed;
    }
    await expectRateLimited(await requestUpgrade(url, cookie));
    // Another Participant is counted on their own and takes the other seat.
    const other = await signInPlayerWithNickname(auth, origin);
    const otherSocket = await openSocket(url, other.cookie);
    expect(await otherSocket.next()).toMatchObject({ type: "state", seat: 1 });
    otherSocket.close();
    await stop();

    const warnings = warningsFor(player.id);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.properties.limit).toBe("duelSocket");
  });
});

test("upgrades to the Queue socket beyond the limit are refused with 429, and logged", async () => {
  await withRedis(async (redis) => {
    const { origin, socketOrigin, stop } = listenWith(redis, {
      limits: { queueSocket: twoPerMinute },
    });
    const { player, cookie } = await signInPlayerWithNickname(auth, origin);
    const url = `${socketOrigin}/api/queue/socket`;

    for (let opened = 0; opened < 2; opened++) {
      const socket = await openSocketOf<QueueServerMessage, never>(url, cookie);
      expect(await socket.next()).toMatchObject({ type: "queued" });
      socket.close();
      await socket.closed;
    }
    await expectRateLimited(await requestUpgrade(url, cookie));
    await stop();

    const warnings = warningsFor(player.id);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.properties.limit).toBe("queueSocket");
  });
});

test("the Duel socket and the Queue socket are counted apart", async () => {
  await withRedis(async (redis) => {
    const { origin, socketOrigin, stop } = listenWith(redis, {
      limits: { duelSocket: { max: 1, windowSeconds: 60 }, queueSocket: twoPerMinute },
    });
    const { cookie } = await signInPlayerWithNickname(auth, origin);
    const id = await createDuel(origin, cookie);
    const duelSocket = await openSocket(`${socketOrigin}/api/duels/${id}/socket`, cookie);
    await duelSocket.next();
    duelSocket.close();
    await duelSocket.closed;

    const queueSocket = await openSocketOf<QueueServerMessage, never>(
      `${socketOrigin}/api/queue/socket`,
      cookie,
    );
    expect(await queueSocket.next()).toMatchObject({ type: "queued" });
    queueSocket.close();
    await stop();
  });
});

test("a Duel socket flooding past the message cap is closed with 1008, its excess never reaches the Opponent nor the journal, and its Participant is away and may rejoin", async () => {
  await withRedis(async (redis) => {
    const { origin, socketOrigin, stop } = listenWith(redis, {
      socketMessages: { max: 3, windowSeconds: 60 },
    });
    const flooder = await signInPlayerWithNickname(auth, origin);
    const opponentCookie = (await signInPlayerWithNickname(auth, origin)).cookie;
    const id = await createDuel(origin, flooder.cookie);
    const url = `${socketOrigin}/api/duels/${id}/socket`;
    const flooding = await openSocket(url, flooder.cookie);
    await flooding.next();
    const opponent = await openSocket(url, opponentCookie);
    // State and Countdown for the opponent; presence and Countdown for the flooder.
    for (const socket of [opponent, opponent, flooding, flooding]) await socket.next();

    flooding.send({ type: "event", round: 1, event: { type: "start", at: 10 } });
    flooding.send({ type: "event", round: 1, event: { type: "insert", at: 20, text: "a" } });
    flooding.send({ type: "event", round: 1, event: { type: "insert", at: 30, text: "b" } });
    flooding.send({ type: "event", round: 1, event: { type: "insert", at: 40, text: "c" } });
    const closeCode = await flooding.closed;
    const relayed = [await opponent.next(), await opponent.next(), await opponent.next()];
    const away = await opponent.next();
    const again = await openSocket(url, flooder.cookie);
    const state = await again.next();
    const back = await opponent.next();
    again.close();
    opponent.close();
    await stop();

    expect(closeCode).toBe(1008);
    expect(relayed.map((message) => message.type)).toEqual([
      "opponentEvent",
      "opponentEvent",
      "opponentEvent",
    ]);
    expect(away).toMatchObject({ type: "presence", participant: { seat: 0, connected: false } });
    expect(state).toMatchObject({
      type: "state",
      seat: 0,
      journals: [
        [
          { type: "start", at: 10 },
          { type: "insert", at: 20, text: "a" },
          { type: "insert", at: 30, text: "b" },
        ],
        [],
      ],
    });
    expect(back).toMatchObject({ type: "presence", participant: { seat: 0, connected: true } });
    const warnings = warningsFor(flooder.player.id);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.category).toEqual(["api", "duel"]);
    expect(warnings[0]?.properties).toMatchObject({ duelId: id, seat: 0 });
  });
});

test("malformed messages count toward the message cap: a socket flooding them is closed with 1008", async () => {
  await withRedis(async (redis) => {
    const { origin, socketOrigin, stop } = listenWith(redis, {
      socketMessages: { max: 3, windowSeconds: 60 },
    });
    const flooder = await signInPlayerWithNickname(auth, origin);
    const id = await createDuel(origin, flooder.cookie);
    // Sends whatever it is given: the server's body validation refuses each of these.
    const flooding = await openSocketOf<ServerMessage, unknown>(
      `${socketOrigin}/api/duels/${id}/socket`,
      flooder.cookie,
    );
    await flooding.next();

    for (let sent = 0; sent < 10; sent++) flooding.send({ type: "malformed" });
    const closeCode = await flooding.closed;
    await stop();

    expect(closeCode).toBe(1008);
    expect(warningsFor(flooder.player.id)).toHaveLength(1);
  });
});
