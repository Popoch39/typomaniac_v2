import { afterAll, expect, test } from "bun:test";
import { getLogger, type LogRecord, resetLogger, setupLogger } from "@repo/logger";
import { createApp } from "../src/app.ts";
import { createTestAuth } from "./helpers/auth.ts";
import { createTestDb } from "./helpers/db.ts";
import { createTestRedis } from "./helpers/redis.ts";

const testDb = await createTestDb();
const testRedis = await createTestRedis();
const auth = createTestAuth(testDb.db);
const records: LogRecord[] = [];
await setupLogger({ sink: (record) => void records.push(record) });
afterAll(async () => {
  await resetLogger();
  await testRedis.drop();
  await testDb.drop();
});

test("a failed Duel sweep is logged as an error of the duel category, through the logger given to the app", async () => {
  // Redis refuses the sweep's read of the due Duels.
  const client = new Proxy(testRedis.redis.client, {
    get: (target, property) => {
      if (property === "send") return () => Promise.reject(new Error("Redis is gone"));
      const value: unknown = Reflect.get(target, property);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  const app = createApp(testDb.db, auth, { ...testRedis.redis, client }, getLogger("api"), {
    sweepIntervalMs: 10,
  }).listen(0);
  try {
    for (let tries = 0; tries < 50 && records.length === 0; tries += 1) await Bun.sleep(10);
  } finally {
    await app.stop();
  }

  const [record] = records;
  expect(record?.category).toEqual(["api", "duel"]);
  expect(record?.level).toBe("error");
  expect(record?.properties.error).toEqual(new Error("Redis is gone"));
});
