import { afterAll, expect, test } from "bun:test";
import { DUEL_WORD_COUNT, START_WINDOW_MS } from "@repo/duel-engine";
import { createApp } from "../src/app.ts";
import { createTestAuth, signInPlayer } from "./helpers/auth.ts";
import { createTestDb } from "./helpers/db.ts";
import { createTestRedis } from "./helpers/redis.ts";
import { openSocket, requestUpgrade } from "./helpers/socket.ts";

const testDb = await createTestDb();
const testRedis = await createTestRedis();
const auth = createTestAuth(testDb.db);
// Listening on an ephemeral port: the in-process request seam cannot upgrade a connection.
const app = createApp(testDb.db, auth, testRedis.redis).listen(0);
const origin = `http://localhost:${app.server?.port}`;
afterAll(async () => {
  await app.stop(true);
  await testRedis.drop();
  await testDb.drop();
});

const signInPlayerWithNickname = async (nickname: string) => {
  const { cookie } = await signInPlayer(auth);
  const response = await fetch(`${origin}/api/me/nickname`, {
    method: "PUT",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ nickname }),
  });
  expect(response.status).toBe(200);
  return cookie;
};

const createDuel = (cookie?: string) =>
  fetch(`${origin}/api/duels`, { method: "POST", headers: cookie ? { cookie } : {} });

const duelSocketUrl = (duelId: string) =>
  `${origin.replace(/^http/, "ws")}/api/duels/${duelId}/socket`;

const uniqueNickname = () => `p_${crypto.randomUUID().slice(0, 8)}`;

test("a Player with a Nickname creates a Duel and takes its first seat, alone and waiting", async () => {
  const nickname = uniqueNickname();
  const cookie = await signInPlayerWithNickname(nickname);

  const response = await createDuel(cookie);
  expect(response.status).toBe(201);
  const { id } = (await response.json()) as { id: string };

  const socket = await openSocket(duelSocketUrl(id), cookie);
  const state = await socket.next();
  socket.close();

  expect(state).toMatchObject({
    type: "state",
    seat: 0,
    participants: [{ seat: 0, name: nickname, connected: true }],
    journals: [[], []],
  });
  expect(state.type === "state" && state.words.length).toBe(DUEL_WORD_COUNT);
});

test("a second Player joins by the link and both see each other's name, on the same words", async () => {
  const creatorName = uniqueNickname();
  const opponentName = uniqueNickname();
  const creatorCookie = await signInPlayerWithNickname(creatorName);
  const opponentCookie = await signInPlayerWithNickname(opponentName);
  const { id } = (await (await createDuel(creatorCookie)).json()) as { id: string };

  const creator = await openSocket(duelSocketUrl(id), creatorCookie);
  const creatorState = await creator.next();
  const opponent = await openSocket(duelSocketUrl(id), opponentCookie);
  const opponentState = await opponent.next();
  const presence = await creator.next();
  creator.close();
  opponent.close();

  expect(opponentState).toMatchObject({
    type: "state",
    seat: 1,
    participants: [
      { seat: 0, name: creatorName, connected: true },
      { seat: 1, name: opponentName, connected: true },
    ],
  });
  expect(presence).toEqual({
    type: "presence",
    participant: { seat: 1, name: opponentName, connected: true },
  });
  expect(creatorState.type === "state" && creatorState.words).toEqual(
    opponentState.type === "state" && opponentState.words,
  );
});

test("the upgrade is refused for a Duel that does not exist", async () => {
  const cookie = await signInPlayerWithNickname(uniqueNickname());

  const response = await requestUpgrade(duelSocketUrl(crypto.randomUUID()), cookie);

  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ code: "DUEL_NOT_FOUND" });
});

test("the upgrade is refused for a full Duel", async () => {
  const cookies = await Promise.all(
    [1, 2, 3].map(() => signInPlayerWithNickname(uniqueNickname())),
  );
  const [first, second, third] = cookies as [string, string, string];
  const { id } = (await (await createDuel(first)).json()) as { id: string };
  const seated = [
    await openSocket(duelSocketUrl(id), first),
    await openSocket(duelSocketUrl(id), second),
  ];

  const response = await requestUpgrade(duelSocketUrl(id), third);
  for (const socket of seated) socket.close();

  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({ code: "DUEL_FULL" });
});

test("a Player already seated in a Duel is refused its other seat", async () => {
  const cookie = await signInPlayerWithNickname(uniqueNickname());
  const { id } = (await (await createDuel(cookie)).json()) as { id: string };
  const seated = await openSocket(duelSocketUrl(id), cookie);

  const response = await requestUpgrade(duelSocketUrl(id), cookie);
  seated.close();

  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({ code: "ALREADY_SEATED" });
});

test("a visitor without a session can neither create nor join a Duel", async () => {
  const cookie = await signInPlayerWithNickname(uniqueNickname());
  const { id } = (await (await createDuel(cookie)).json()) as { id: string };

  for (const response of [await createDuel(), await requestUpgrade(duelSocketUrl(id))]) {
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ code: "UNAUTHORIZED" });
  }
});

test("a Player without a Nickname can neither create nor join a Duel", async () => {
  const { cookie } = await signInPlayer(auth);
  const creatorCookie = await signInPlayerWithNickname(uniqueNickname());
  const { id } = (await (await createDuel(creatorCookie)).json()) as { id: string };

  for (const response of [
    await createDuel(cookie),
    await requestUpgrade(duelSocketUrl(id), cookie),
  ]) {
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ code: "NICKNAME_REQUIRED" });
  }
});

test("a Duel nobody joined no longer exists once its expiry has passed", async () => {
  // A second app on the same database and Redis, with an expiry short enough to wait for.
  const shortLived = createApp(testDb.db, auth, testRedis.redis, { expiryMs: 200 }).listen(0);
  try {
    const cookie = await signInPlayerWithNickname(uniqueNickname());
    const created = await fetch(`http://localhost:${shortLived.server?.port}/api/duels`, {
      method: "POST",
      headers: { cookie },
    });
    const { id } = (await created.json()) as { id: string };

    await Bun.sleep(300);
    const response = await requestUpgrade(duelSocketUrl(id), cookie);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ code: "DUEL_NOT_FOUND" });
  } finally {
    await shortLived.stop(true);
  }
});

test("a Player who closed their socket is shown away, then takes their own seat again", async () => {
  const creatorName = uniqueNickname();
  const creatorCookie = await signInPlayerWithNickname(creatorName);
  const opponentCookie = await signInPlayerWithNickname(uniqueNickname());
  const { id } = (await (await createDuel(creatorCookie)).json()) as { id: string };
  const first = await openSocket(duelSocketUrl(id), creatorCookie);
  await first.next();
  const opponent = await openSocket(duelSocketUrl(id), opponentCookie);
  await opponent.next();
  // Both seats are connected: the Countdown comes before anything else.
  await opponent.next();

  first.close();
  const away = await opponent.next();
  const again = await openSocket(duelSocketUrl(id), creatorCookie);
  const state = await again.next();
  again.close();
  opponent.close();

  expect(away).toEqual({
    type: "presence",
    participant: { seat: 0, name: creatorName, connected: false },
  });
  expect(state).toMatchObject({ type: "state", seat: 0 });
});

test("two Players on two API instances sharing Redis see each other arrive", async () => {
  const other = createApp(testDb.db, auth, testRedis.redis).listen(0);
  try {
    const opponentName = uniqueNickname();
    const creatorCookie = await signInPlayerWithNickname(uniqueNickname());
    const opponentCookie = await signInPlayerWithNickname(opponentName);
    const { id } = (await (await createDuel(creatorCookie)).json()) as { id: string };
    const creator = await openSocket(duelSocketUrl(id), creatorCookie);
    await creator.next();

    const opponent = await openSocket(
      `ws://localhost:${other.server?.port}/api/duels/${id}/socket`,
      opponentCookie,
    );
    const presence = await creator.next();
    creator.close();
    opponent.close();

    expect(presence).toEqual({
      type: "presence",
      participant: { seat: 1, name: opponentName, connected: true },
    });
  } finally {
    await other.stop(true);
  }
});

test("a Player reads who sits in a Duel, and is told when it does not exist", async () => {
  const creatorName = uniqueNickname();
  const cookie = await signInPlayerWithNickname(creatorName);
  const { id } = (await (await createDuel(cookie)).json()) as { id: string };
  const creator = await openSocket(duelSocketUrl(id), cookie);
  await creator.next();

  const found = await fetch(`${origin}/api/duels/${id}`, { headers: { cookie } });
  const missing = await fetch(`${origin}/api/duels/${crypto.randomUUID()}`, {
    headers: { cookie },
  });
  creator.close();

  expect(found.status).toBe(200);
  expect(await found.json()).toEqual({
    participants: [{ seat: 0, name: creatorName, connected: true }],
  });
  expect(missing.status).toBe(404);
  expect(await missing.json()).toEqual({ code: "DUEL_NOT_FOUND" });
});

test("the server answers a clock ping with the client instant echoed and its own instant", async () => {
  const cookie = await signInPlayerWithNickname(uniqueNickname());
  const { id } = (await (await createDuel(cookie)).json()) as { id: string };
  const socket = await openSocket(duelSocketUrl(id), cookie);
  await socket.next();

  const before = Date.now();
  socket.send({ type: "ping", clientAt: 123.5 });
  const pong = await socket.next();
  const after = Date.now();
  socket.close();

  expect(pong).toEqual({ type: "pong", clientAt: 123.5, serverAt: expect.any(Number) });
  const serverAt = pong.type === "pong" ? pong.serverAt : Number.NaN;
  expect(serverAt).toBeGreaterThanOrEqual(before);
  expect(serverAt).toBeLessThanOrEqual(after);
});

test("the Countdown is announced to both Participants once both are connected, with a Start 3 seconds ahead", async () => {
  const creatorCookie = await signInPlayerWithNickname(uniqueNickname());
  const opponentCookie = await signInPlayerWithNickname(uniqueNickname());
  const { id } = (await (await createDuel(creatorCookie)).json()) as { id: string };
  const creator = await openSocket(duelSocketUrl(id), creatorCookie);
  await creator.next();

  const before = Date.now();
  const opponent = await openSocket(duelSocketUrl(id), opponentCookie);
  await opponent.next();
  const opponentCountdown = await opponent.next();
  await creator.next();
  const creatorCountdown = await creator.next();
  const after = Date.now();
  creator.close();
  opponent.close();

  expect(opponentCountdown).toEqual({ type: "countdown", startAt: expect.any(Number) });
  expect(creatorCountdown).toEqual(opponentCountdown);
  const startAt = opponentCountdown.type === "countdown" ? opponentCountdown.startAt : Number.NaN;
  expect(startAt).toBeGreaterThanOrEqual(before + 3000);
  expect(startAt).toBeLessThanOrEqual(after + 3000);
});

// Seats two Players in a Duel of an app whose Countdown is short enough to wait for, and reads the Start.
const startDuel = async (countdownMs: number) => {
  const quick = createApp(testDb.db, auth, testRedis.redis, { countdownMs }).listen(0);
  const socketUrl = (duelId: string) =>
    `ws://localhost:${quick.server?.port}/api/duels/${duelId}/socket`;
  const creatorCookie = await signInPlayerWithNickname(uniqueNickname());
  const opponentCookie = await signInPlayerWithNickname(uniqueNickname());
  const { id } = (await (await createDuel(creatorCookie)).json()) as { id: string };
  const creator = await openSocket(socketUrl(id), creatorCookie);
  await creator.next();
  const opponent = await openSocket(socketUrl(id), opponentCookie);
  await opponent.next();
  const countdown = await opponent.next();
  if (countdown.type !== "countdown")
    throw new Error(`Expected the Countdown, got ${countdown.type}`);
  return {
    creator,
    opponent,
    startAt: countdown.startAt,
    stop: async () => {
      creator.close();
      opponent.close();
      await quick.stop(true);
    },
  };
};

test("an Event before the Start and a start too early are refused, a start at the announced instant is accepted", async () => {
  const { creator, opponent, startAt, stop } = await startDuel(1500);
  try {
    creator.send({ type: "event", event: { type: "keyDown", at: 1, code: "KeyA" } });
    creator.send({ type: "event", event: { type: "insert", at: 2, text: "a" } });
    creator.send({ type: "event", event: { type: "start", at: 3 } });
    await Bun.sleep(startAt - Date.now());
    creator.send({ type: "event", event: { type: "start", at: 4 } });
    creator.send({ type: "event", event: { type: "insert", at: 5, text: "s" } });

    expect(await opponent.next()).toEqual({
      type: "opponentEvent",
      event: { type: "start", at: 4 },
    });
    expect(await opponent.next()).toEqual({
      type: "opponentEvent",
      event: { type: "insert", at: 5, text: "s" },
    });
  } finally {
    await stop();
  }
});

test("a start sent too long after the announced instant is refused", async () => {
  const { creator, opponent, startAt, stop } = await startDuel(0);
  try {
    await Bun.sleep(startAt + START_WINDOW_MS + 100 - Date.now());
    creator.send({ type: "event", event: { type: "start", at: 1 } });
    creator.send({ type: "event", event: { type: "insert", at: 2, text: "s" } });

    expect(await opponent.staysSilent(300)).toBe(true);
  } finally {
    await stop();
  }
});
