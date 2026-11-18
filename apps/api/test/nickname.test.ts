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

const chooseNickname = (nickname: unknown, cookie?: string) =>
  app.handle(
    new Request("http://localhost/api/me/nickname", {
      method: "PUT",
      headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
      body: JSON.stringify({ nickname }),
    }),
  );

const readProfile = async (cookie: string) => {
  const response = await app.handle(
    new Request("http://localhost/api/me", { headers: { cookie } }),
  );
  return response.json();
};

test("a Player chooses their Nickname and reads it back with the case they typed", async () => {
  const { player, cookie } = await signInPlayer(auth);

  const response = await chooseNickname("Ada_Lovelace-1815", cookie);

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ id: player.id, nickname: "Ada_Lovelace-1815" });
  expect(await readProfile(cookie)).toEqual({ id: player.id, nickname: "Ada_Lovelace-1815" });
});

test("a Guest choosing a Nickname is told they are not signed in", async () => {
  const response = await chooseNickname("Grace");

  expect(response.status).toBe(401);
});

test.each([
  ["shorter than 3 characters", "ab"],
  ["longer than 20 characters", "a".repeat(21)],
  ["with a space", "ada lovelace"],
  ["with an accented letter", "adélaïde"],
  ["with a dot", "ada.lovelace"],
  ["ending with a line break", "adalovelace\n"],
  ["that is not a string", 12345],
  ["that is missing", undefined],
])("a Nickname %s is refused and leaves the Player without Nickname", async (_rule, nickname) => {
  const { player, cookie } = await signInPlayer(auth);

  const response = await chooseNickname(nickname, cookie);

  expect(response.status).toBe(422);
  expect(await response.json()).toEqual({ code: "NICKNAME_INVALID" });
  expect(await readProfile(cookie)).toEqual({ id: player.id, nickname: null });
});

test("a badly formatted Nickname gets the same answer in production", async () => {
  const { cookie } = await signInPlayer(auth);
  const nodeEnv = process.env.NODE_ENV;
  // Elysia strips its default validation responses under this value, which the prod image sets.
  process.env.NODE_ENV = "production";
  try {
    const response = await chooseNickname("ab", cookie);

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ code: "NICKNAME_INVALID" });
  } finally {
    process.env.NODE_ENV = nodeEnv;
  }
});

test("a Nickname of exactly 3 or 20 characters is accepted", async () => {
  for (const nickname of ["a-1", "B".repeat(20)]) {
    const { cookie } = await signInPlayer(auth);

    expect((await chooseNickname(nickname, cookie)).status).toBe(200);
  }
});

test.each(["admin", "Admin", "TYPOMANIAC", "Guest", "nUlL", "mod"])(
  "the reserved Nickname %s is refused",
  async (nickname) => {
    const { player, cookie } = await signInPlayer(auth);

    const response = await chooseNickname(nickname, cookie);

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ code: "NICKNAME_RESERVED" });
    expect(await readProfile(cookie)).toEqual({ id: player.id, nickname: null });
  },
);

test("a Nickname already taken by another Player is refused, whatever the case", async () => {
  const first = await signInPlayer(auth);
  const second = await signInPlayer(auth);
  await chooseNickname("Hopper", first.cookie);

  for (const nickname of ["Hopper", "hopper", "HOPPER"]) {
    const response = await chooseNickname(nickname, second.cookie);

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ code: "NICKNAME_TAKEN" });
  }
  expect(await readProfile(second.cookie)).toEqual({ id: second.player.id, nickname: null });
  expect(await readProfile(first.cookie)).toEqual({ id: first.player.id, nickname: "Hopper" });
});

test("two Players choosing the same Nickname at the same time: exactly one gets it", async () => {
  const first = await signInPlayer(auth);
  const second = await signInPlayer(auth);

  const responses = await Promise.all([
    chooseNickname("Turing", first.cookie),
    chooseNickname("turing", second.cookie),
  ]);

  expect(responses.map((response) => response.status).toSorted((a, b) => a - b)).toEqual([
    200, 409,
  ]);
});

test("a Player changes their Nickname, which frees the old one for another Player", async () => {
  const first = await signInPlayer(auth);
  const second = await signInPlayer(auth);
  await chooseNickname("Lamarr", first.cookie);

  const changed = await chooseNickname("Hedy", first.cookie);

  expect(changed.status).toBe(200);
  expect(await readProfile(first.cookie)).toEqual({ id: first.player.id, nickname: "Hedy" });
  const taken = await chooseNickname("lamarr", second.cookie);
  expect(taken.status).toBe(200);
  expect(await readProfile(second.cookie)).toEqual({ id: second.player.id, nickname: "lamarr" });
});

test("a Player takes their own Nickname again with another case", async () => {
  const { player, cookie } = await signInPlayer(auth);
  await chooseNickname("johnson", cookie);

  const response = await chooseNickname("JohnSon", cookie);

  expect(response.status).toBe(200);
  expect(await readProfile(cookie)).toEqual({ id: player.id, nickname: "JohnSon" });
});

test("Better Auth's own routes cannot set the Nickname", async () => {
  const { player, cookie } = await signInPlayer(auth);

  const response = await app.handle(
    new Request("http://localhost/api/auth/update-user", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost", cookie },
      body: JSON.stringify({ nickname: "admin" }),
    }),
  );

  expect(response.status).toBe(400);
  expect(await readProfile(cookie)).toEqual({ id: player.id, nickname: null });
});

const probe = new Elysia()
  .use(createProtection(auth))
  .get("/probe", { nicknameChosen: true }, ({ player }) => ({
    id: player.id,
    shout: player.nickname.toUpperCase(),
  }));

const callProbe = (cookie?: string) =>
  probe.handle(new Request("http://localhost/probe", { headers: cookie ? { cookie } : {} }));

test("a route protected by nicknameChosen tells a Guest they are not signed in", async () => {
  const response = await callProbe();

  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ code: "UNAUTHORIZED" });
});

test("a route protected by nicknameChosen tells a Player without Nickname to choose one", async () => {
  const { cookie } = await signInPlayer(auth);

  const response = await callProbe(cookie);

  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ code: "NICKNAME_REQUIRED" });
});

test("a route protected by nicknameChosen receives the Player and their Nickname", async () => {
  const { player, cookie } = await signInPlayer(auth);
  await chooseNickname("Borg", cookie);

  const response = await callProbe(cookie);

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ id: player.id, shout: "BORG" });
});
