import { afterAll, expect, test } from "bun:test";
import { DUEL_GAME_CONFIG, DUEL_WORD_COUNT, START_WINDOW_MS } from "@repo/duel-engine";
import { applyEvent, createGame, type GameEvent, getResult } from "@repo/typing-engine";
import { count, eq } from "drizzle-orm";
import { createApp } from "../src/app.ts";
import { duel, duelGame, user } from "../src/db/schema.ts";
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

test("a Player opening a Duel twice gets their own seat back, never its other seat", async () => {
  const nickname = uniqueNickname();
  const cookie = await signInPlayerWithNickname(nickname);
  const { id } = (await (await createDuel(cookie)).json()) as { id: string };
  const seated = await openSocket(duelSocketUrl(id), cookie);
  await seated.next();

  const twice = await openSocket(duelSocketUrl(id), cookie);
  const state = await twice.next();
  await seated.closed;
  twice.close();

  expect(state).toMatchObject({
    type: "state",
    seat: 0,
    participants: [{ seat: 0, name: nickname, connected: true }],
  });
});

// The name/value pair a browser would send back from the Guest cookie the API set.
const guestCookieOf = (response: Response) => {
  const cookie = response.headers.getSetCookie().find((header) => header.startsWith("guest="));
  if (!cookie) throw new Error("No Guest cookie was set");
  return cookie.split(";")[0] ?? "";
};

test("a Guest creates a Duel under a generated display name, which the Player who joins sees", async () => {
  const created = await createDuel();
  expect(created.status).toBe(201);
  const guestCookie = guestCookieOf(created);
  const { id } = (await created.json()) as { id: string };
  const playerName = uniqueNickname();
  const playerCookie = await signInPlayerWithNickname(playerName);

  const guest = await openSocket(duelSocketUrl(id), guestCookie);
  const guestState = await guest.next();
  const player = await openSocket(duelSocketUrl(id), playerCookie);
  const playerState = await player.next();
  guest.close();
  player.close();

  const guestName = guestState.type === "state" ? guestState.participants[0]?.name : undefined;
  expect(guestName).toMatch(/^Guest \d{4}$/);
  expect(playerState).toMatchObject({
    type: "state",
    seat: 1,
    participants: [
      { seat: 0, name: guestName, connected: true },
      { seat: 1, name: playerName, connected: true },
    ],
  });
});

test("a Guest without a cookie joins by the link and is handed their cookie with the handshake", async () => {
  const creatorName = uniqueNickname();
  const creatorCookie = await signInPlayerWithNickname(creatorName);
  const { id } = (await (await createDuel(creatorCookie)).json()) as { id: string };
  const creator = await openSocket(duelSocketUrl(id), creatorCookie);
  await creator.next();

  const handshake = await requestUpgrade(duelSocketUrl(id));
  const guestCookie = guestCookieOf(handshake);
  const arrived = await creator.next();
  creator.close();

  expect(handshake.status).toBe(101);
  expect(arrived).toMatchObject({
    type: "presence",
    participant: { seat: 1, name: expect.stringMatching(/^Guest \d{4}$/), connected: true },
  });
  expect(guestCookie).toStartWith("guest=");
});

test("the same Guest opening a full Duel again gets their own seat back", async () => {
  const created = await createDuel();
  const guestCookie = guestCookieOf(created);
  const { id } = (await created.json()) as { id: string };
  const seated = await openSocket(duelSocketUrl(id), guestCookie);
  await seated.next();
  const opponent = await openSocket(
    duelSocketUrl(id),
    await signInPlayerWithNickname(uniqueNickname()),
  );
  await opponent.next();

  const again = await openSocket(duelSocketUrl(id), guestCookie);
  const state = await again.next();
  await seated.closed;
  again.close();
  opponent.close();

  expect(state).toMatchObject({ type: "state", seat: 0 });
});

test("a Participant whose old socket still holds their seat takes it back from another instance, and the old socket is closed", async () => {
  const other = createApp(testDb.db, auth, testRedis.redis).listen(0);
  try {
    const creatorName = uniqueNickname();
    const creatorCookie = await signInPlayerWithNickname(creatorName);
    const opponentCookie = await signInPlayerWithNickname(uniqueNickname());
    const { id } = (await (await createDuel(creatorCookie)).json()) as { id: string };
    const stale = await openSocket(
      `ws://localhost:${other.server?.port}/api/duels/${id}/socket`,
      creatorCookie,
    );
    await stale.next();
    const opponent = await openSocket(duelSocketUrl(id), opponentCookie);
    // State and Countdown.
    await opponent.next();
    await opponent.next();

    const again = await openSocket(duelSocketUrl(id), creatorCookie);
    const state = await again.next();
    await stale.closed;
    const back = await opponent.next();
    // The old socket closing does not show the Participant away: their seat is held by the new one.
    const silent = await opponent.staysSilent(300);
    again.close();
    opponent.close();

    expect(state).toMatchObject({ type: "state", seat: 0 });
    expect(back).toEqual({
      type: "presence",
      participant: { seat: 0, name: creatorName, connected: true },
    });
    expect(silent).toBe(true);
  } finally {
    await other.stop(true);
  }
});

const forgedGuestCookies = {
  tampered: (cookie: string) => {
    const [payload = "", signature] = cookie.slice("guest=".length).split(".");
    const guest = JSON.parse(Buffer.from(payload, "base64url").toString()) as { id: string };
    const renamed = Buffer.from(JSON.stringify({ ...guest, name: "Guest 0000" })).toString(
      "base64url",
    );
    return `guest=${renamed}.${signature}`;
  },
  unsigned: (cookie: string) => cookie.split(".")[0] ?? "",
};

for (const [forgery, forge] of Object.entries(forgedGuestCookies)) {
  test(`a ${forgery} Guest cookie is not accepted as the Guest it names`, async () => {
    const created = await createDuel();
    const guestCookie = guestCookieOf(created);
    const { id } = (await created.json()) as { id: string };
    const guest = await openSocket(duelSocketUrl(id), guestCookie);
    await guest.next();
    guest.close();

    const impostor = await openSocket(duelSocketUrl(id), forge(guestCookie));
    const state = await impostor.next();
    impostor.close();

    expect(state).toMatchObject({ type: "state", seat: 1 });
  });
}

test("no row is written to the database for a Guest who creates and joins a Duel", async () => {
  const countPlayers = async () =>
    (await testDb.db.select({ count: count() }).from(user))[0]?.count;
  const before = await countPlayers();

  const created = await createDuel();
  const { id } = (await created.json()) as { id: string };
  const guest = await openSocket(duelSocketUrl(id), guestCookieOf(created));
  await guest.next();
  guest.close();

  expect(await countPlayers()).toBe(before);
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
    expect(response.headers.getSetCookie()).toEqual([]);
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
const startDuel = async (
  countdownMs: number,
  cookies: { creatorCookie?: string; opponentCookie?: string } = {},
  db = testDb.db,
) => {
  const quick = createApp(db, auth, testRedis.redis, { countdownMs }).listen(0);
  const socketUrl = (duelId: string) =>
    `ws://localhost:${quick.server?.port}/api/duels/${duelId}/socket`;
  const creatorCookie = cookies.creatorCookie ?? (await signInPlayerWithNickname(uniqueNickname()));
  const opponentCookie =
    cookies.opponentCookie ?? (await signInPlayerWithNickname(uniqueNickname()));
  const { id } = (await (await createDuel(creatorCookie)).json()) as { id: string };
  const creator = await openSocket(socketUrl(id), creatorCookie);
  await creator.next();
  const opponent = await openSocket(socketUrl(id), opponentCookie);
  const state = await opponent.next();
  if (state.type !== "state") throw new Error(`Expected the state, got ${state.type}`);
  const countdown = await opponent.next();
  if (countdown.type !== "countdown")
    throw new Error(`Expected the Countdown, got ${countdown.type}`);
  // The creator learns of the Start through the relay: until then, its start would be refused.
  await creator.next();
  await creator.next();
  return {
    creator,
    opponent,
    duelId: id,
    startAt: countdown.startAt,
    words: state.words,
    reopenCreator: () => openSocket(socketUrl(id), creatorCookie),
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

test("the Events a Participant sends are kept in their Game's journal, handed back when they return", async () => {
  const { creator, opponent, reopenCreator, stop } = await startDuel(0);
  try {
    creator.send({ type: "event", event: { type: "start", at: 10 } });
    creator.send({ type: "event", event: { type: "insert", at: 20, text: "a" } });
    await opponent.next();
    await opponent.next();

    creator.close();
    await opponent.next();
    const again = await reopenCreator();
    const state = await again.next();
    again.close();

    expect(state).toMatchObject({
      type: "state",
      seat: 0,
      journals: [
        [
          { type: "start", at: 10 },
          { type: "insert", at: 20, text: "a" },
        ],
        [],
      ],
    });
  } finally {
    await stop();
  }
});

test("a Participant who comes back on another API instance resumes the same Game, and the Opponent sees them leave and return", async () => {
  const first = createApp(testDb.db, auth, testRedis.redis, { countdownMs: 0 }).listen(0);
  const second = createApp(testDb.db, auth, testRedis.redis, { countdownMs: 0 }).listen(0);
  const socketUrl = (port: number | undefined, duelId: string) =>
    `ws://localhost:${port}/api/duels/${duelId}/socket`;
  try {
    const creatorName = uniqueNickname();
    const creatorCookie = await signInPlayerWithNickname(creatorName);
    const opponentCookie = await signInPlayerWithNickname(uniqueNickname());
    const { id } = (await (await createDuel(creatorCookie)).json()) as { id: string };
    const creator = await openSocket(socketUrl(first.server?.port, id), creatorCookie);
    await creator.next();
    const opponent = await openSocket(socketUrl(second.server?.port, id), opponentCookie);
    // State and Countdown for the opponent; presence and Countdown for the creator.
    for (const socket of [opponent, opponent, creator, creator]) await socket.next();
    creator.send({ type: "event", event: { type: "start", at: 10 } });
    opponent.send({ type: "event", event: { type: "start", at: 11 } });
    creator.send({ type: "event", event: { type: "insert", at: 20, text: "a" } });
    opponent.send({ type: "event", event: { type: "insert", at: 21, text: "b" } });
    for (const socket of [opponent, opponent, creator, creator]) await socket.next();

    creator.close();
    const away = await opponent.next();
    const again = await openSocket(socketUrl(second.server?.port, id), creatorCookie);
    const state = await again.next();
    const back = await opponent.next();
    // Already started before the disconnection: a second start is refused, typing goes on.
    again.send({ type: "event", event: { type: "start", at: 30 } });
    again.send({ type: "event", event: { type: "insert", at: 40, text: "c" } });
    const relayed = await opponent.next();
    again.close();
    opponent.close();

    expect(away).toEqual({
      type: "presence",
      participant: { seat: 0, name: creatorName, connected: false },
    });
    expect(state).toMatchObject({
      type: "state",
      seat: 0,
      journals: [
        [
          { type: "start", at: 10 },
          { type: "insert", at: 20, text: "a" },
        ],
        [
          { type: "start", at: 11 },
          { type: "insert", at: 21, text: "b" },
        ],
      ],
    });
    expect(back).toEqual({
      type: "presence",
      participant: { seat: 0, name: creatorName, connected: true },
    });
    expect(relayed).toEqual({
      type: "opponentEvent",
      event: { type: "insert", at: 40, text: "c" },
    });
  } finally {
    await first.stop(true);
    await second.stop(true);
  }
});

test("a Participant who comes back after the Start without having started has their Game started at the Start, and types on", async () => {
  const { creator, opponent, startAt, reopenCreator, stop } = await startDuel(0);
  try {
    creator.close();
    await opponent.next();
    await Bun.sleep(startAt + START_WINDOW_MS + 100 - Date.now());

    const again = await reopenCreator();
    const state = await again.next();
    again.send({ type: "event", event: { type: "insert", at: startAt + 2000, text: "a" } });
    const toOpponent = [await opponent.next(), await opponent.next(), await opponent.next()];
    again.close();

    expect(state).toMatchObject({
      type: "state",
      journals: [[{ type: "start", at: startAt }], []],
    });
    expect(toOpponent).toEqual([
      { type: "presence", participant: expect.objectContaining({ seat: 0, connected: true }) },
      { type: "opponentEvent", event: { type: "start", at: startAt } },
      { type: "opponentEvent", event: { type: "insert", at: startAt + 2000, text: "a" } },
    ]);
  } finally {
    await stop();
  }
});

test("the server refuses addWords from a client: no word is added during a Duel", async () => {
  const { creator, opponent, stop } = await startDuel(0);
  try {
    creator.send({ type: "event", event: { type: "start", at: 10 } });
    creator.send({ type: "event", event: { type: "addWords", words: ["extra"] } });
    creator.send({ type: "event", event: { type: "insert", at: 20, text: "a" } });

    expect(await opponent.next()).toEqual({
      type: "opponentEvent",
      event: { type: "start", at: 10 },
    });
    expect(await opponent.next()).toEqual({
      type: "opponentEvent",
      event: { type: "insert", at: 20, text: "a" },
    });
  } finally {
    await stop();
  }
});

test("a Tick reaching 30 seconds ends the Game, and the Events sent after its end are refused", async () => {
  const { creator, opponent, stop } = await startDuel(0);
  try {
    creator.send({ type: "event", event: { type: "start", at: 10 } });
    creator.send({ type: "event", event: { type: "tick", at: 30_010 } });
    creator.send({ type: "event", event: { type: "insert", at: 30_020, text: "a" } });
    creator.send({ type: "event", event: { type: "tick", at: 31_010 } });

    expect(await opponent.next()).toEqual({
      type: "opponentEvent",
      event: { type: "start", at: 10 },
    });
    expect(await opponent.next()).toEqual({
      type: "opponentEvent",
      event: { type: "tick", at: 30_010 },
    });
    expect(await opponent.staysSilent(300)).toBe(true);
  } finally {
    await stop();
  }
});

// Skips the Opponent's Events and presence changes, which may come before or after the end.
const nextEnd = async (socket: Awaited<ReturnType<typeof openSocket>>) => {
  for (;;) {
    const message = await socket.next();
    if (message.type === "end") return message;
  }
};

test("once both Games are finished, both Participants receive both Results and both Outcomes", async () => {
  const { creator, opponent, words, stop } = await startDuel(0);
  try {
    const [firstWord = ""] = words;
    creator.send({ type: "event", event: { type: "start", at: 10 } });
    creator.send({ type: "event", event: { type: "insert", at: 1010, text: `${firstWord} ` } });
    creator.send({ type: "event", event: { type: "tick", at: 30_010 } });
    opponent.send({ type: "event", event: { type: "start", at: 11 } });
    opponent.send({ type: "event", event: { type: "tick", at: 30_011 } });

    const ends = [await nextEnd(creator), await nextEnd(opponent)];

    expect(ends[0]).toEqual(ends[1]);
    expect(ends[0]).toMatchObject({
      type: "end",
      // The first word and its Separator, exactly typed in half a minute, at 5 characters a word.
      results: [
        { duration: 30, wpm: ((firstWord.length + 1) / 5) * 2, accuracy: 100 },
        { duration: 30, wpm: 0 },
      ],
      outcomes: ["win", "loss"],
    });
  } finally {
    await stop();
  }
});

test("a finished Duel is saved with both Games, their Results, journals and Outcomes, a Guest's without a Player", async () => {
  const { player, cookie: creatorCookie } = await signInPlayer(auth);
  const nicknamed = await fetch(`${origin}/api/me/nickname`, {
    method: "PUT",
    headers: { "content-type": "application/json", cookie: creatorCookie },
    body: JSON.stringify({ nickname: uniqueNickname() }),
  });
  expect(nicknamed.status).toBe(200);
  const guestCookie = guestCookieOf(await createDuel());
  const { creator, opponent, duelId, startAt, words, stop } = await startDuel(0, {
    creatorCookie,
    opponentCookie: guestCookie,
  });
  try {
    const creatorJournal: GameEvent[] = [
      { type: "start", at: 10 },
      { type: "insert", at: 1010, text: `${words[0]} ` },
      { type: "tick", at: 30_010 },
    ];
    const guestJournal: GameEvent[] = [
      { type: "start", at: 11 },
      { type: "insert", at: 1011, text: "x" },
      { type: "tick", at: 30_011 },
    ];
    for (const event of creatorJournal) creator.send({ type: "event", event });
    for (const event of guestJournal) opponent.send({ type: "event", event });
    const { results } = await nextEnd(creator);
    await nextEnd(opponent);

    const [saved] = await testDb.db.select().from(duel).where(eq(duel.id, duelId));
    const games = await testDb.db
      .select()
      .from(duelGame)
      .where(eq(duelGame.duelId, duelId))
      .orderBy(duelGame.seat);

    expect(saved).toMatchObject({
      config: { mode: "time", seconds: 30 },
      words,
      startedAt: new Date(startAt),
    });
    expect(saved?.endedAt.getTime()).toBeGreaterThanOrEqual(startAt);
    expect(games).toEqual([
      {
        duelId,
        seat: 0,
        playerId: player.id,
        result: results[0],
        journal: creatorJournal,
        outcome: "win",
      },
      {
        duelId,
        seat: 1,
        playerId: null,
        result: results[1],
        journal: guestJournal,
        outcome: "loss",
      },
    ]);
  } finally {
    await stop();
  }
});

test("a Participant who comes back after the end of the Duel is handed the end again", async () => {
  const { creator, opponent, reopenCreator, stop } = await startDuel(0);
  try {
    for (const socket of [creator, opponent]) {
      socket.send({ type: "event", event: { type: "start", at: 10 } });
      socket.send({ type: "event", event: { type: "tick", at: 30_010 } });
    }
    const end = await nextEnd(creator);

    creator.close();
    const again = await reopenCreator();
    const handedAgain = await nextEnd(again);
    again.close();

    expect(handedAgain).toEqual(end);
  } finally {
    await stop();
  }
});

test("replaying a saved journal gives the saved Result", async () => {
  const { creator, opponent, duelId, words, stop } = await startDuel(0);
  try {
    creator.send({ type: "event", event: { type: "start", at: 10 } });
    creator.send({ type: "event", event: { type: "insert", at: 900, text: "x" } });
    creator.send({ type: "event", event: { type: "delete", at: 1000, unit: "char" } });
    creator.send({ type: "event", event: { type: "insert", at: 1500, text: `${words[0]} ` } });
    creator.send({ type: "event", event: { type: "tick", at: 30_010 } });
    opponent.send({ type: "event", event: { type: "start", at: 11 } });
    opponent.send({ type: "event", event: { type: "tick", at: 30_011 } });
    await nextEnd(creator);

    const games = await testDb.db.select().from(duelGame).where(eq(duelGame.duelId, duelId));

    expect(games).toHaveLength(2);
    for (const game of games) {
      const replayed = game.journal.reduce(applyEvent, createGame(DUEL_GAME_CONFIG, words));
      expect(getResult(replayed)).toEqual(game.result);
    }
  } finally {
    await stop();
  }
});

test("nothing is written to the database for a Duel that never finishes", async () => {
  const cookie = await signInPlayerWithNickname(uniqueNickname());
  const { id } = (await (await createDuel(cookie)).json()) as { id: string };
  const alone = await openSocket(duelSocketUrl(id), cookie);
  await alone.next();
  alone.send({ type: "event", event: { type: "start", at: 10 } });
  alone.send({ type: "event", event: { type: "tick", at: 30_010 } });
  await Bun.sleep(300);
  alone.close();

  expect(await testDb.db.select().from(duel).where(eq(duel.id, id))).toEqual([]);
  expect(await testDb.db.select().from(duelGame).where(eq(duelGame.duelId, id))).toEqual([]);
});

test("a Game whose client goes silent is ended by the server 2 seconds after the deadline, at its start plus 30 seconds", async () => {
  const { creator, opponent, startAt, words, stop } = await startDuel(0);
  try {
    const [firstWord = ""] = words;
    creator.send({ type: "event", event: { type: "start", at: 10 } });
    creator.send({ type: "event", event: { type: "tick", at: 30_010 } });
    opponent.send({ type: "event", event: { type: "start", at: 500 } });
    opponent.send({ type: "event", event: { type: "insert", at: 1500, text: `${firstWord} ` } });

    const end = await nextEnd(creator);

    expect(Date.now()).toBeGreaterThanOrEqual(startAt + 32_000);
    expect(end).toMatchObject({
      results: [
        { duration: 30, wpm: 0 },
        { duration: 30, wpm: ((firstWord.length + 1) / 5) * 2 },
      ],
      outcomes: ["loss", "win"],
    });
  } finally {
    await stop();
  }
}, 40_000);

test("a Duel whose save failed is finalised again at the deadline, saved once, and its end announced", async () => {
  let failuresLeft = 1;
  // The real database, but for its first transaction, refused as by a database out of reach.
  const flakyDb = new Proxy(testDb.db, {
    get: (target, key) => {
      if (key === "transaction" && failuresLeft > 0) {
        failuresLeft -= 1;
        return () => Promise.reject(new Error("The database cannot be reached"));
      }
      const value: unknown = Reflect.get(target, key);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  const { creator, opponent, duelId, startAt, stop } = await startDuel(0, {}, flakyDb);
  try {
    for (const socket of [creator, opponent]) {
      socket.send({ type: "event", event: { type: "start", at: 10 } });
      socket.send({ type: "event", event: { type: "tick", at: 30_010 } });
    }

    const ends = [await nextEnd(creator), await nextEnd(opponent)];

    expect(failuresLeft).toBe(0);
    expect(Date.now()).toBeGreaterThanOrEqual(startAt + 32_000);
    expect(ends[0]).toMatchObject({ type: "end", outcomes: ["draw", "draw"] });
    expect(ends[1]).toEqual(ends[0]);
    expect(await testDb.db.select().from(duel).where(eq(duel.id, duelId))).toHaveLength(1);
    expect(await testDb.db.select().from(duelGame).where(eq(duelGame.duelId, duelId))).toHaveLength(
      2,
    );
  } finally {
    await stop();
  }
}, 40_000);

test("two Participants on two API instances sharing Redis receive each other's Events", async () => {
  const first = createApp(testDb.db, auth, testRedis.redis, { countdownMs: 0 }).listen(0);
  const second = createApp(testDb.db, auth, testRedis.redis, { countdownMs: 0 }).listen(0);
  const socketUrl = (port: number | undefined, duelId: string) =>
    `ws://localhost:${port}/api/duels/${duelId}/socket`;
  try {
    const creatorCookie = await signInPlayerWithNickname(uniqueNickname());
    const opponentCookie = await signInPlayerWithNickname(uniqueNickname());
    const { id } = (await (await createDuel(creatorCookie)).json()) as { id: string };
    const creator = await openSocket(socketUrl(first.server?.port, id), creatorCookie);
    await creator.next();
    const opponent = await openSocket(socketUrl(second.server?.port, id), opponentCookie);
    // State and Countdown for the opponent; presence and Countdown for the creator.
    for (const socket of [opponent, opponent, creator, creator]) await socket.next();

    creator.send({ type: "event", event: { type: "start", at: 10 } });
    opponent.send({ type: "event", event: { type: "start", at: 11 } });
    creator.send({ type: "event", event: { type: "insert", at: 20, text: "a" } });
    opponent.send({ type: "event", event: { type: "insert", at: 21, text: "b" } });
    const toOpponent = [await opponent.next(), await opponent.next()];
    const toCreator = [await creator.next(), await creator.next()];
    creator.close();
    opponent.close();

    expect(toOpponent).toEqual([
      { type: "opponentEvent", event: { type: "start", at: 10 } },
      { type: "opponentEvent", event: { type: "insert", at: 20, text: "a" } },
    ]);
    expect(toCreator).toEqual([
      { type: "opponentEvent", event: { type: "start", at: 11 } },
      { type: "opponentEvent", event: { type: "insert", at: 21, text: "b" } },
    ]);
  } finally {
    await first.stop(true);
    await second.stop(true);
  }
});

test("with two API instances on one Redis, a Duel is finalised and saved exactly once", async () => {
  const first = createApp(testDb.db, auth, testRedis.redis, { countdownMs: 0 }).listen(0);
  const second = createApp(testDb.db, auth, testRedis.redis, { countdownMs: 0 }).listen(0);
  const socketUrl = (port: number | undefined, duelId: string) =>
    `ws://localhost:${port}/api/duels/${duelId}/socket`;
  try {
    const creatorCookie = await signInPlayerWithNickname(uniqueNickname());
    const opponentCookie = await signInPlayerWithNickname(uniqueNickname());
    const { id } = (await (await createDuel(creatorCookie)).json()) as { id: string };
    const creator = await openSocket(socketUrl(first.server?.port, id), creatorCookie);
    await creator.next();
    const opponent = await openSocket(socketUrl(second.server?.port, id), opponentCookie);
    for (const socket of [opponent, opponent, creator, creator]) await socket.next();

    // Both final Ticks at once, so that both instances see both Games ended.
    for (const socket of [creator, opponent]) {
      socket.send({ type: "event", event: { type: "start", at: 10 } });
      socket.send({ type: "event", event: { type: "tick", at: 30_010 } });
    }
    const ends = [await nextEnd(creator), await nextEnd(opponent)];
    const silent = [await creator.staysSilent(300), await opponent.staysSilent(0)];
    creator.close();
    opponent.close();

    expect(ends[0]).toMatchObject({ type: "end", outcomes: ["draw", "draw"] });
    expect(ends[1]).toEqual(ends[0]);
    expect(silent).toEqual([true, true]);
    expect(await testDb.db.select().from(duel).where(eq(duel.id, id))).toHaveLength(1);
    expect(await testDb.db.select().from(duelGame).where(eq(duelGame.duelId, id))).toHaveLength(2);
  } finally {
    await first.stop(true);
    await second.stop(true);
  }
});
