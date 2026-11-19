import { afterAll, expect, test } from "bun:test";
import { Elysia } from "elysia";
import { getLogger } from "@repo/logger";
import { createApp } from "../src/app.ts";
import { createProtection } from "../src/modules/auth/index.ts";
import { createRateLimiter } from "../src/modules/rate-limit/index.ts";
import { saveStanding } from "../src/modules/standing/service.ts";
import { createTestAuth, signInPlayer } from "./helpers/auth.ts";
import { createTestDb } from "./helpers/db.ts";
import { createTestRedis } from "./helpers/redis.ts";

const testDb = await createTestDb();
const testRedis = await createTestRedis();
afterAll(async () => {
  await testRedis.drop();
  await testDb.drop();
});
const auth = createTestAuth(testDb.db);
const app = createApp(testDb.db, auth, testRedis.redis, getLogger("api"));

test("a Guest asking for their profile is told they are not signed in", async () => {
  const response = await app.handle(new Request("http://localhost/api/me"));
  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ code: "UNAUTHORIZED" });
});

test("a session cookie that Better Auth did not sign is refused", async () => {
  const { cookie } = await signInPlayer(auth);
  const [name, value] = cookie.split("=", 2);
  const token = value?.split(".")[0];

  for (const forged of [`${name}=${token}`, `${name}=${token}.forged`, `${name}=unknown.forged`]) {
    const response = await app.handle(
      new Request("http://localhost/api/me", { headers: { cookie: forged } }),
    );
    expect(response.status).toBe(401);
  }
});

test("a route protected by signedIn receives the Player and their session", async () => {
  const probe = new Elysia()
    .use(createProtection(auth, createRateLimiter(testRedis.redis, getLogger("api"))))
    .get("/probe", { signedIn: true }, ({ player, session }) => ({
      playerId: player.id,
      sessionPlayerId: session.userId,
    }));
  const { player, cookie } = await signInPlayer(auth);

  const response = await probe.handle(
    new Request("http://localhost/probe", { headers: { cookie } }),
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ playerId: player.id, sessionPlayerId: player.id });
});

test("a Player with no Nickname reads their own profile, without their email", async () => {
  const { player, cookie } = await signInPlayer(auth, { email: "ada@example.com" });

  const response = await app.handle(
    new Request("http://localhost/api/me", { headers: { cookie } }),
  );

  expect(response.status).toBe(200);
  expect(await response.clone().json()).toEqual({
    id: player.id,
    nickname: null,
    avatarUrl: null,
    ornament: { tier: "unranked", division: null },
  });
  expect(await response.text()).not.toContain("ada@example.com");
});

test("a Player whose provider gave a picture reads it as their Avatar", async () => {
  const image = "https://avatars.githubusercontent.com/u/1?v=4";
  const { player, cookie } = await signInPlayer(auth, { image });

  const response = await app.handle(
    new Request("http://localhost/api/me", { headers: { cookie } }),
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ id: player.id, nickname: null, avatarUrl: image });
});

test("a new Player wears the Unranked plate", async () => {
  const { cookie } = await signInPlayer(auth);

  const response = await app.handle(
    new Request("http://localhost/api/me", { headers: { cookie } }),
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ ornament: { tier: "unranked", division: null } });
});

test("a ranked Player wears the Ornament of their Tier, with their Division", async () => {
  const { player, cookie } = await signInPlayer(auth);
  await saveStanding(testDb.db, player.id, {
    mmr: 1400,
    duelsPlayed: 12,
    rank: { tier: "gold", division: 2, lp: 30 },
  });

  const response = await app.handle(
    new Request("http://localhost/api/me", { headers: { cookie } }),
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ ornament: { tier: "gold", division: 2 } });
});
