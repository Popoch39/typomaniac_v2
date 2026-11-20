import { afterAll, expect, test } from "bun:test";
import type { Db } from "@repo/db";
import { getLogger } from "@repo/logger";
import { startFairPlayWorker } from "../src/worker.ts";
import { createTestDb } from "./helpers/db.ts";

// Short enough to wait for: the real ones are several seconds.
const passMs = 20;
const lockMs = 200;

const until = async (condition: () => boolean, timeoutMs = 2000) => {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error("the awaited condition never became true");
    await Bun.sleep(5);
  }
};

// Every worker of one test shares the database of that test, hence its leader lock.
const startCounting = (db: Db) => {
  const instants: number[] = [];
  const worker = startFairPlayWorker(
    db,
    (now) => void instants.push(now),
    getLogger("fair-play-worker"),
    { passMs, lockMs },
  );
  return { instants, stop: worker.stop };
};

const opened: Awaited<ReturnType<typeof createTestDb>>[] = [];
const openTestDb = async () => {
  const testDb = await createTestDb();
  opened.push(testDb);
  return testDb.db;
};
afterAll(async () => {
  for (const testDb of opened) await testDb.drop();
});

test("a worker alone runs the pass again and again, with the current instant", async () => {
  const before = Date.now();
  const alone = startCounting(await openTestDb());

  await until(() => alone.instants.length >= 3);
  await alone.stop();

  expect(alone.instants[0]).toBeGreaterThanOrEqual(before);
  expect(alone.instants).toEqual(alone.instants.toSorted((a, b) => a - b));
});

test("a stopped worker no longer runs the pass", async () => {
  const alone = startCounting(await openTestDb());
  await until(() => alone.instants.length >= 1);

  await alone.stop();
  const passed = alone.instants.length;
  await Bun.sleep(passMs * 5);

  expect(alone.instants).toHaveLength(passed);
});

test("a second worker started by mistake does not run the pass while the first holds the lock, however long that lasts", async () => {
  const db = await openTestDb();
  const first = startCounting(db);
  await until(() => first.instants.length >= 1);
  const second = startCounting(db);

  // Several lock expiries long: the first can only still be the leader by renewing its lock.
  await Bun.sleep(lockMs * 3);
  await first.stop();
  await second.stop();

  expect(second.instants).toHaveLength(0);
  expect(first.instants.length).toBeGreaterThan(3);
});

test("a second worker takes over once the lock of a stopped leader expires", async () => {
  const db = await openTestDb();
  const first = startCounting(db);
  await until(() => first.instants.length >= 1);
  const second = startCounting(db);

  await first.stop();
  const stoppedAt = Date.now();
  await until(() => second.instants.length >= 1);
  await second.stop();

  // Not before the expiry: until then the lock still names the first.
  expect(second.instants[0]).toBeGreaterThanOrEqual(stoppedAt + lockMs - passMs);
});
