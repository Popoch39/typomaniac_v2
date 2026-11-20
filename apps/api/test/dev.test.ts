import { afterAll, expect, test } from "bun:test";
import { getLogger } from "@repo/logger";
import { createApp } from "../src/app.ts";
import { readDevOptions } from "../src/modules/dev/config.ts";
import { createTestAuth } from "./helpers/auth.ts";
import { createTestDb } from "./helpers/db.ts";
import { createTestRedis } from "./helpers/redis.ts";

const testDb = await createTestDb();
const testRedis = await createTestRedis();
afterAll(async () => {
  await testRedis.drop();
  await testDb.drop();
});
const auth = createTestAuth(testDb.db);
const enabledApp = createApp(testDb.db, auth, testRedis.redis, getLogger("api"), {
  dev: { signIn: true },
});
const disabledApp = createApp(testDb.db, auth, testRedis.redis, getLogger("api"));

const signIn = (app: typeof enabledApp, nickname: string) =>
  app.handle(
    new Request("http://localhost/api/dev/sign-in", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nickname }),
    }),
  );

const sessionCookieOf = (response: Response) => response.headers.get("set-cookie")?.split(";")[0];

test("a dev sign-in gives a session to a Dev Player who already has their Nickname", async () => {
  const response = await signIn(enabledApp, "dev_alice");
  expect(response.status).toBe(200);
  const cookie = sessionCookieOf(response);
  expect(cookie).toBeDefined();

  const me = await enabledApp.handle(
    new Request("http://localhost/api/me", { headers: { cookie: cookie ?? "" } }),
  );
  expect(me.status).toBe(200);
  expect(await me.json()).toMatchObject({ nickname: "dev_alice" });
});

test("signing in again as the same Dev Player finds them rather than creating another", async () => {
  const first = await signIn(enabledApp, "dev_bob");
  const second = await signIn(enabledApp, "dev_bob");
  expect(await second.json()).toEqual(await first.json());
});

test("a Dev Player may queue at once, as no provider made their account", async () => {
  const cookie = sessionCookieOf(await signIn(enabledApp, "dev_alice")) ?? "";

  const queue = await enabledApp.handle(
    new Request("http://localhost/api/queue", { headers: { cookie } }),
  );
  expect(queue.status).toBe(200);
});

test("only the known Dev Players can be signed in as", async () => {
  expect((await signIn(enabledApp, "someone_else")).status).toBe(422);
});

test("dev sign-in answers not found unless the entry enables it", async () => {
  const response = await signIn(disabledApp, "dev_alice");
  expect(response.status).toBe(404);
  expect(response.headers.get("set-cookie")).toBeNull();
});

test("dev sign-in cannot be enabled in production", () => {
  expect(readDevOptions({ DEV_SIGN_IN: "enabled" })).toEqual({ signIn: true });
  expect(readDevOptions({})).toEqual({ signIn: false });
  expect(() => readDevOptions({ DEV_SIGN_IN: "enabled", NODE_ENV: "production" })).toThrow(
    "DEV_SIGN_IN",
  );
});
