import { afterAll, expect, test } from "bun:test";
import { getLogger } from "@repo/logger";
import { startMatchmaker } from "../src/matchmaker.ts";
import { createTestRedis } from "./helpers/redis.ts";

// Short enough to wait for: the real ones are one second and a few seconds.
const tickMs = 20;
const lockMs = 200;

const until = async (condition: () => boolean, timeoutMs = 2000) => {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error("the awaited condition never became true");
    await Bun.sleep(5);
  }
};

// Every matchmaker of one test shares the Redis of that test, hence its leader lock.
const startCounting = (redis: Awaited<ReturnType<typeof createTestRedis>>["redis"]) => {
  const instants: number[] = [];
  const matchmaker = startMatchmaker(
    redis,
    (now) => void instants.push(now),
    getLogger("matchmaker"),
    { tickMs, lockMs },
  );
  return { instants, stop: matchmaker.stop };
};

const opened: Awaited<ReturnType<typeof createTestRedis>>[] = [];
const openTestRedis = async () => {
  const testRedis = await createTestRedis();
  opened.push(testRedis);
  return testRedis.redis;
};
afterAll(async () => {
  for (const testRedis of opened) await testRedis.drop();
});

test("a matchmaker alone ticks again and again, with the current instant", async () => {
  const before = Date.now();
  const alone = startCounting(await openTestRedis());

  await until(() => alone.instants.length >= 3);
  alone.stop();

  expect(alone.instants[0]).toBeGreaterThanOrEqual(before);
  expect(alone.instants).toEqual(alone.instants.toSorted((a, b) => a - b));
});

test("a stopped matchmaker no longer ticks", async () => {
  const alone = startCounting(await openTestRedis());
  await until(() => alone.instants.length >= 1);

  alone.stop();
  const ticked = alone.instants.length;
  await Bun.sleep(tickMs * 5);

  expect(alone.instants).toHaveLength(ticked);
});

test("a second matchmaker does not tick while the first holds the leader lock, however long that lasts", async () => {
  const redis = await openTestRedis();
  const first = startCounting(redis);
  await until(() => first.instants.length >= 1);
  const second = startCounting(redis);

  // Several lock expiries long: the first can only still be the leader by renewing its lock.
  await Bun.sleep(lockMs * 3);
  first.stop();
  second.stop();

  expect(second.instants).toHaveLength(0);
  expect(first.instants.length).toBeGreaterThan(3);
});

test("a second matchmaker takes over once the lock of a stopped leader expires", async () => {
  const redis = await openTestRedis();
  const first = startCounting(redis);
  await until(() => first.instants.length >= 1);
  const second = startCounting(redis);

  first.stop();
  const stoppedAt = Date.now();
  await until(() => second.instants.length >= 1);
  second.stop();

  // Not before the expiry: until then the lock still names the first.
  expect(second.instants[0]).toBeGreaterThanOrEqual(stoppedAt + lockMs - tickMs);
});
