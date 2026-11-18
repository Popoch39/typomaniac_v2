import { afterAll, expect, test } from "bun:test";
import { Elysia } from "elysia";
import { createApp } from "../src/app.ts";
import { createProtection } from "../src/modules/auth/index.ts";
import { createTestAuth, signInPlayer } from "./helpers/auth.ts";
import { createTestDb } from "./helpers/db.ts";

const testDb = await createTestDb();
afterAll(() => testDb.drop());
const auth = createTestAuth(testDb.db);
const app = createApp(testDb.db, auth);

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
    .use(createProtection(auth))
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
  expect(await response.clone().json()).toEqual({ id: player.id, nickname: null });
  expect(await response.text()).not.toContain("ada@example.com");
});
