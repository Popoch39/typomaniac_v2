import { afterAll, expect, test } from "bun:test";
import { getLogger, type LogRecord, resetLogger, setupLogger } from "@repo/logger";
import { createApp } from "../src/app.ts";
import type { RateLimitOptions } from "../src/modules/rate-limit/index.ts";
import type { Redis } from "../src/redis/client.ts";
import { createTestAuth, signInPlayer, signInPlayerWithNickname } from "./helpers/auth.ts";
import { createTestDb } from "./helpers/db.ts";
import { createTestRedis } from "./helpers/redis.ts";

const testDb = await createTestDb();
const auth = createTestAuth(testDb.db);
const records: LogRecord[] = [];
await setupLogger({ sink: (record) => void records.push(record) });
afterAll(async () => {
  await resetLogger();
  await testDb.drop();
});

// Listening on an ephemeral port: the client IP is read from the socket, which the in-process
// request seam does not have. Every request of this file comes from the same loopback address.
const listenWith = (redis: Redis, rateLimitOptions: RateLimitOptions) => {
  const app = createApp(testDb.db, auth, redis, getLogger("api"), {
    rateLimit: rateLimitOptions,
  }).listen(0);
  return { origin: `http://localhost:${app.server?.port}`, stop: () => app.stop(true) };
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

const generous = { max: 1000, windowSeconds: 60 };
const twoPerMinute = { max: 2, windowSeconds: 60 };
const onePerMinute = { max: 1, windowSeconds: 60 };

const chooseNickname = (origin: string, cookie: string) =>
  fetch(`${origin}/api/me/nickname`, {
    method: "PUT",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ nickname: `p_${crypto.randomUUID().slice(0, 8)}` }),
  });

const createDuel = (origin: string, headers: Record<string, string> = {}) =>
  fetch(`${origin}/api/duels`, { method: "POST", headers });

const expectRateLimited = async (response: Response) => {
  expect(response.status).toBe(429);
  expect(await response.json()).toEqual({ code: "RATE_LIMITED" });
  const retryAfter = Number(response.headers.get("retry-after"));
  expect(retryAfter).toBeGreaterThanOrEqual(1);
  expect(retryAfter).toBeLessThanOrEqual(60);
};

test("a Player changing their Nickname beyond the limit is refused with 429 and Retry-After, and the refusal is logged", async () => {
  await withRedis(async (redis) => {
    const { origin, stop } = listenWith(redis, { limits: { nickname: twoPerMinute } });
    const { player, cookie } = await signInPlayer(auth);

    expect((await chooseNickname(origin, cookie)).status).toBe(200);
    expect((await chooseNickname(origin, cookie)).status).toBe(200);
    await expectRateLimited(await chooseNickname(origin, cookie));
    await stop();

    const warnings = records.filter(({ properties }) => properties.key === player.id);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.level).toBe("warning");
    expect(warnings[0]?.category).toEqual(["api", "rate-limit"]);
    expect(warnings[0]?.properties.limit).toBe("nickname");
  });
});

test("two Players behind the same IP do not share their Nickname count", async () => {
  await withRedis(async (redis) => {
    const { origin, stop } = listenWith(redis, { limits: { nickname: onePerMinute } });
    const first = await signInPlayer(auth);
    const second = await signInPlayer(auth);

    expect((await chooseNickname(origin, first.cookie)).status).toBe(200);
    expect((await chooseNickname(origin, second.cookie)).status).toBe(200);
    expect((await chooseNickname(origin, first.cookie)).status).toBe(429);
    await stop();
  });
});

test("a Participant creating Custom Duels beyond their own limit is refused with 429", async () => {
  await withRedis(async (redis) => {
    const { origin, stop } = listenWith(redis, {
      limits: { duelPerParticipant: twoPerMinute, duelPerIp: generous, guestPerIp: generous },
    });
    const first = await createDuel(origin);
    expect(first.status).toBe(201);
    const cookie = first.headers.get("set-cookie") ?? "";

    expect((await createDuel(origin, { cookie })).status).toBe(201);
    await expectRateLimited(await createDuel(origin, { cookie }));
    // Another Participant behind the same IP still creates theirs.
    expect((await createDuel(origin)).status).toBe(201);
    await stop();
  });
});

test("Custom Duels created from one IP beyond its limit are refused with 429, whoever creates them", async () => {
  await withRedis(async (redis) => {
    const { origin, stop } = listenWith(redis, {
      limits: { duelPerParticipant: generous, duelPerIp: twoPerMinute, guestPerIp: generous },
    });

    // A new Guest each time: dropping the cookie does not escape the IP's count.
    expect((await createDuel(origin)).status).toBe(201);
    expect((await createDuel(origin)).status).toBe(201);
    await expectRateLimited(await createDuel(origin));
    await stop();
  });
});

test("new Guests from one IP beyond its limit get a 429 instead of a cookie", async () => {
  await withRedis(async (redis) => {
    const { origin, stop } = listenWith(redis, {
      limits: { duelPerParticipant: generous, duelPerIp: generous, guestPerIp: twoPerMinute },
    });

    expect((await createDuel(origin)).status).toBe(201);
    const second = await createDuel(origin);
    expect(second.status).toBe(201);
    const refused = await createDuel(origin);
    await expectRateLimited(refused);
    expect(refused.headers.get("set-cookie")).toBeNull();
    // A Guest who already holds a cookie is not a new one.
    const cookie = second.headers.get("set-cookie") ?? "";
    expect((await createDuel(origin, { cookie })).status).toBe(201);
    await stop();
  });
});

test("public Player pages read without a session beyond the progress limit of one IP are refused with 429", async () => {
  await withRedis(async (redis) => {
    const { origin, stop } = listenWith(redis, {
      limits: { publicReadPerRequester: generous, publicReadPerIp: twoPerMinute },
    });
    const { nickname } = await signInPlayerWithNickname(auth, origin);
    const readPage = () => fetch(`${origin}/api/players/${nickname}`);

    expect((await readPage()).status).toBe(200);
    expect((await readPage()).status).toBe(200);
    await expectRateLimited(await readPage());
    await stop();
  });
});

test("public Player pages and Progress read from one IP beyond its limit are refused with 429, whoever reads them", async () => {
  await withRedis(async (redis) => {
    const { origin, stop } = listenWith(redis, {
      limits: { publicReadPerRequester: generous, publicReadPerIp: twoPerMinute },
    });
    const { nickname } = await signInPlayerWithNickname(auth, origin);
    // A new Player each time: signing in as someone else does not escape the IP's count.
    const readAsNewPlayer = async (path: string) =>
      fetch(`${origin}/api/players/${nickname}${path}`, {
        headers: { cookie: (await signInPlayer(auth)).cookie },
      });

    expect((await readAsNewPlayer("")).status).toBe(200);
    expect((await readAsNewPlayer("/progress")).status).toBe(200);
    await expectRateLimited(await readAsNewPlayer("/progress"));
    await stop();
  });
});

test("without TRUST_PROXY, a forged X-Forwarded-For does not change the IP a request is counted against", async () => {
  await withRedis(async (redis) => {
    const { origin, stop } = listenWith(redis, {
      limits: { duelPerParticipant: generous, duelPerIp: generous, guestPerIp: onePerMinute },
    });

    expect((await createDuel(origin, { "x-forwarded-for": "203.0.113.1" })).status).toBe(201);
    expect((await createDuel(origin, { "x-forwarded-for": "203.0.113.2" })).status).toBe(429);
    await stop();
  });
});

test("with TRUST_PROXY, a request is counted against the leftmost X-Forwarded-For address", async () => {
  await withRedis(async (redis) => {
    const { origin, stop } = listenWith(redis, {
      trustProxy: true,
      limits: { duelPerParticipant: generous, duelPerIp: generous, guestPerIp: onePerMinute },
    });
    const from = (forwardedFor: string) => createDuel(origin, { "x-forwarded-for": forwardedFor });

    expect((await from("203.0.113.1, 10.0.0.1")).status).toBe(201);
    expect((await from("203.0.113.2, 10.0.0.1")).status).toBe(201);
    expect((await from("203.0.113.1, 10.0.0.2")).status).toBe(429);
    await stop();
  });
});

test("two API instances sharing one Redis share the counts", async () => {
  await withRedis(async (redis) => {
    const limits = { duelPerParticipant: generous, duelPerIp: generous, guestPerIp: onePerMinute };
    const first = listenWith(redis, { limits });
    const second = listenWith(redis, { limits });

    expect((await createDuel(first.origin)).status).toBe(201);
    expect((await createDuel(second.origin)).status).toBe(429);
    await first.stop();
    await second.stop();
  });
});
