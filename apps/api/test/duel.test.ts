import { afterAll, expect, test } from "bun:test";
import {
  DUEL_GAME_CONFIG,
  DUEL_WORD_COUNT,
  type ServerMessage,
  START_WINDOW_MS,
} from "@repo/duel-engine";
import { applyEvent, createGame, type GameEvent, getResult } from "@repo/typing-engine";
import { and, count, eq } from "drizzle-orm";
import { getLogger } from "@repo/logger";
import { createApp } from "../src/app.ts";
import { duel, duelGame, duelParticipant, duelRound, user } from "../src/db/schema.ts";
import { saveStanding } from "../src/modules/standing/service.ts";
import { createTestAuth, signInPlayer } from "./helpers/auth.ts";
import { createTestDb } from "./helpers/db.ts";
import { createTestRedis } from "./helpers/redis.ts";
import { openSocket, requestUpgrade } from "./helpers/socket.ts";

const testDb = await createTestDb();
const testRedis = await createTestRedis();
const auth = createTestAuth(testDb.db);
// Listening on an ephemeral port: the in-process request seam cannot upgrade a connection.
const app = createApp(testDb.db, auth, testRedis.redis, getLogger("api")).listen(0);
const origin = `http://localhost:${app.server?.port}`;
// The Redis of the apps started with delays of their own: every instance sweeping one Redis
// advances its Duels by its own delays, so these do not share the one of the default app.
const quickRedis = await createTestRedis();
afterAll(async () => {
  await app.stop(true);
  await quickRedis.drop();
  await testRedis.drop();
  await testDb.drop();
});

const signInPlayerWithNickname = async (nickname: string, image?: string) => {
  const { cookie } = await signInPlayer(auth, { image });
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

// What a Player who never played ranked wears by default.
const unrankedPlate = { tier: "unranked", division: null } as const;

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

  expect(state).toEqual({
    type: "state",
    seat: 0,
    round: 1,
    rounds: [],
    startAt: null,
    words: null,
    participants: [
      { seat: 0, name: nickname, avatarUrl: null, ornament: unrankedPlate, connected: true },
    ],
    ranks: null,
    journals: [[], []],
  });
});

test("a second Player joins by the link and both see each other's name", async () => {
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
      { seat: 0, name: creatorName, avatarUrl: null, ornament: unrankedPlate, connected: true },
      { seat: 1, name: opponentName, avatarUrl: null, ornament: unrankedPlate, connected: true },
    ],
  });
  expect(presence).toEqual({
    type: "presence",
    participant: {
      seat: 1,
      name: opponentName,
      avatarUrl: null,
      ornament: unrankedPlate,
      connected: true,
    },
  });
  expect(creatorState).toMatchObject({ type: "state", seat: 0 });
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
    participants: [
      { seat: 0, name: nickname, avatarUrl: null, ornament: unrankedPlate, connected: true },
    ],
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
      { seat: 0, name: guestName, avatarUrl: null, connected: true },
      { seat: 1, name: playerName, avatarUrl: null, ornament: unrankedPlate, connected: true },
    ],
  });
});

test("each Participant carries their Avatar, none for a Guest", async () => {
  const created = await createDuel();
  const guestCookie = guestCookieOf(created);
  const { id } = (await created.json()) as { id: string };
  const playerName = uniqueNickname();
  const avatarUrl = "https://avatars.githubusercontent.com/u/1?v=4";
  const playerCookie = await signInPlayerWithNickname(playerName, avatarUrl);

  const guest = await openSocket(duelSocketUrl(id), guestCookie);
  await guest.next();
  const player = await openSocket(duelSocketUrl(id), playerCookie);
  const playerState = await player.next();
  const presence = await guest.next();
  guest.close();
  player.close();

  expect(playerState).toMatchObject({
    type: "state",
    participants: [
      { seat: 0, avatarUrl: null },
      { seat: 1, name: playerName, avatarUrl },
    ],
  });
  expect(presence).toEqual({
    type: "presence",
    participant: { seat: 1, name: playerName, avatarUrl, ornament: unrankedPlate, connected: true },
  });
});

test("each Participant carries the Ornament they wore as they took their seat, none for a Guest", async () => {
  const created = await createDuel();
  const guestCookie = guestCookieOf(created);
  const { id } = (await created.json()) as { id: string };
  const playerName = uniqueNickname();
  const playerCookie = await signInPlayerWithNickname(playerName);

  const guest = await openSocket(duelSocketUrl(id), guestCookie);
  await guest.next();
  const player = await openSocket(duelSocketUrl(id), playerCookie);
  const playerState = await player.next();
  const presence = await guest.next();
  guest.close();
  player.close();
  // Ranked meanwhile: the Duel keeps the Ornament the seat was taken with.
  const [seated] = await testDb.db.select().from(user).where(eq(user.nickname, playerName));
  await saveStanding(testDb.db, seated?.id ?? "", {
    mmr: 1400,
    duelsPlayed: 12,
    rank: { tier: "gold", division: 2, lp: 30 },
  });
  const back = await openSocket(duelSocketUrl(id), playerCookie);
  const stateAfterRanking = await back.next();
  back.close();

  expect(playerState).toMatchObject({
    type: "state",
    participants: [
      { seat: 0, ornament: null },
      { seat: 1, name: playerName, ornament: unrankedPlate },
    ],
  });
  expect(presence).toMatchObject({
    type: "presence",
    participant: { seat: 1, name: playerName, ornament: unrankedPlate },
  });
  expect(stateAfterRanking).toMatchObject({
    type: "state",
    participants: [
      { seat: 0, ornament: null },
      { seat: 1, ornament: unrankedPlate },
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
    participant: {
      seat: 1,
      name: expect.stringMatching(/^Guest \d{4}$/),
      avatarUrl: null,
      connected: true,
    },
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
  const other = createApp(testDb.db, auth, testRedis.redis, getLogger("api")).listen(0);
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
      participant: {
        seat: 0,
        name: creatorName,
        avatarUrl: null,
        ornament: unrankedPlate,
        connected: true,
      },
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
  const shortLived = createApp(testDb.db, auth, testRedis.redis, getLogger("api"), {
    expiryMs: 200,
  }).listen(0);
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
    participant: {
      seat: 0,
      name: creatorName,
      avatarUrl: null,
      ornament: unrankedPlate,
      connected: false,
    },
  });
  expect(state).toMatchObject({ type: "state", seat: 0 });
});

test("two Players on two API instances sharing Redis see each other arrive", async () => {
  const other = createApp(testDb.db, auth, testRedis.redis, getLogger("api")).listen(0);
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
      participant: {
        seat: 1,
        name: opponentName,
        avatarUrl: null,
        ornament: unrankedPlate,
        connected: true,
      },
    });
  } finally {
    await other.stop(true);
  }
});

test("the state is the first message a socket receives, even when the Opponent's arrival is relayed while it opens", async () => {
  // The instance the creator opens on stalls the takeover of their opening until the opponent has
  // arrived on the other instance, so the opponent's messages are relayed to it before its state.
  const { promise: stalled, resolve: stall } = Promise.withResolvers<void>();
  const { promise: released, resolve: release } = Promise.withResolvers<void>();
  const client = new Proxy(testRedis.redis.client, {
    get: (target, property) => {
      if (property === "publish")
        return async (channel: string, message: string) => {
          if (message.includes('"takeover"')) {
            stall();
            await released;
          }
          return target.publish(channel, message);
        };
      const value: unknown = Reflect.get(target, property);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  const stalling = createApp(
    testDb.db,
    auth,
    { ...testRedis.redis, client },
    getLogger("api"),
  ).listen(0);
  try {
    const creatorCookie = await signInPlayerWithNickname(uniqueNickname());
    const opponentName = uniqueNickname();
    const opponentCookie = await signInPlayerWithNickname(opponentName);
    const { id } = (await (await createDuel(creatorCookie)).json()) as { id: string };
    const creatorOpening = openSocket(
      `ws://localhost:${stalling.server?.port}/api/duels/${id}/socket`,
      creatorCookie,
    );
    await stalled;
    const opponent = await openSocket(duelSocketUrl(id), opponentCookie);
    expect((await opponent.next()).type).toBe("state");
    expect((await opponent.next()).type).toBe("countdown");

    release();
    const creator = await creatorOpening;
    const received = [await creator.next(), await creator.next(), await creator.next()];
    creator.close();
    opponent.close();

    expect(received[0]?.type).toBe("state");
    // Held back until the state, not lost.
    expect(received).toContainEqual({
      type: "presence",
      participant: {
        seat: 1,
        name: opponentName,
        avatarUrl: null,
        ornament: unrankedPlate,
        connected: true,
      },
    });
    expect(received.map(({ type }) => type)).toContain("countdown");
  } finally {
    await stalling.stop(true);
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
    participants: [
      { seat: 0, name: creatorName, avatarUrl: null, ornament: unrankedPlate, connected: true },
    ],
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

test("the Countdown is announced to both Participants once both are connected, with a Start 3 seconds ahead and the Target words of the Round, which neither held before", async () => {
  const creatorCookie = await signInPlayerWithNickname(uniqueNickname());
  const opponentCookie = await signInPlayerWithNickname(uniqueNickname());
  const { id } = (await (await createDuel(creatorCookie)).json()) as { id: string };
  const creator = await openSocket(duelSocketUrl(id), creatorCookie);
  const creatorState = await creator.next();

  const before = Date.now();
  const opponent = await openSocket(duelSocketUrl(id), opponentCookie);
  const opponentState = await opponent.next();
  const opponentCountdown = await opponent.next();
  await creator.next();
  const creatorCountdown = await creator.next();
  const after = Date.now();
  creator.close();
  opponent.close();

  expect(creatorState).toMatchObject({ type: "state", round: 1, words: null });
  expect(opponentState).toMatchObject({ type: "state", round: 1, words: null });
  if (opponentCountdown.type !== "countdown")
    throw new Error(`Expected the Countdown, got ${opponentCountdown.type}`);
  const { startAt, words } = opponentCountdown;
  expect(opponentCountdown).toEqual({ type: "countdown", round: 1, startAt, words });
  expect(words).toHaveLength(DUEL_WORD_COUNT);
  expect(words.every((word) => typeof word === "string")).toBe(true);
  expect(creatorCountdown).toEqual(opponentCountdown);
  expect(startAt).toBeGreaterThanOrEqual(before + 3000);
  expect(startAt).toBeLessThanOrEqual(after + 3000);
});

// Seats two Players in a Duel of an app whose Countdown is short enough to wait for, and reads the
// Start. Its pause between Rounds is skipped unless a test asks for one.
const startDuel = async (
  countdownMs: number,
  cookies: { creatorCookie?: string; opponentCookie?: string } = {},
  db = testDb.db,
  roundPauseMs = 0,
) => {
  const quick = createApp(db, auth, quickRedis.redis, getLogger("api"), {
    countdownMs,
    roundPauseMs,
  }).listen(0);
  const socketUrl = (duelId: string) =>
    `ws://localhost:${quick.server?.port}/api/duels/${duelId}/socket`;
  const creatorCookie = cookies.creatorCookie ?? (await signInPlayerWithNickname(uniqueNickname()));
  const opponentCookie =
    cookies.opponentCookie ?? (await signInPlayerWithNickname(uniqueNickname()));
  const created = await fetch(`http://localhost:${quick.server?.port}/api/duels`, {
    method: "POST",
    headers: { cookie: creatorCookie },
  });
  const { id } = (await created.json()) as { id: string };
  const creator = await openSocket(socketUrl(id), creatorCookie);
  await creator.next();
  const opponent = await openSocket(socketUrl(id), opponentCookie);
  await opponent.next();
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
    words: countdown.words,
    reopenCreator: () => openSocket(socketUrl(id), creatorCookie),
    reopenOpponent: () => openSocket(socketUrl(id), opponentCookie),
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
    creator.send({ type: "event", round: 1, event: { type: "keyDown", at: 1, code: "KeyA" } });
    creator.send({ type: "event", round: 1, event: { type: "insert", at: 2, text: "a" } });
    creator.send({ type: "event", round: 1, event: { type: "start", at: 3 } });
    await Bun.sleep(startAt - Date.now());
    creator.send({ type: "event", round: 1, event: { type: "start", at: 4 } });
    creator.send({ type: "event", round: 1, event: { type: "insert", at: 5, text: "s" } });

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
    creator.send({ type: "event", round: 1, event: { type: "start", at: 1 } });
    creator.send({ type: "event", round: 1, event: { type: "insert", at: 2, text: "s" } });

    expect(await opponent.staysSilent(300)).toBe(true);
  } finally {
    await stop();
  }
});

test("the Events a Participant sends are kept in their Game's journal, handed back with the Target words when they return", async () => {
  const { creator, opponent, words, reopenCreator, stop } = await startDuel(0);
  try {
    creator.send({ type: "event", round: 1, event: { type: "start", at: 10 } });
    creator.send({ type: "event", round: 1, event: { type: "insert", at: 20, text: "a" } });
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
      round: 1,
      words,
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

test("an Event naming another Round than the current one is ignored", async () => {
  const { creator, opponent, reopenCreator, stop } = await startDuel(0);
  try {
    creator.send({ type: "event", round: 2, event: { type: "start", at: 10 } });
    creator.send({ type: "event", round: 1, event: { type: "start", at: 11 } });
    creator.send({ type: "event", round: 0, event: { type: "insert", at: 20, text: "a" } });
    creator.send({ type: "event", round: 2, event: { type: "insert", at: 21, text: "b" } });
    creator.send({ type: "event", round: 1, event: { type: "insert", at: 22, text: "c" } });
    const relayed = [await opponent.next(), await opponent.next()];
    const silent = await opponent.staysSilent(300);
    creator.close();
    await opponent.next();
    const again = await reopenCreator();
    const state = await again.next();
    again.close();

    const journal: GameEvent[] = [
      { type: "start", at: 11 },
      { type: "insert", at: 22, text: "c" },
    ];
    expect(relayed).toEqual(journal.map((event) => ({ type: "opponentEvent", event })));
    expect(silent).toBe(true);
    expect(state).toMatchObject({ type: "state", round: 1, journals: [journal, []] });
  } finally {
    await stop();
  }
});

test("a Participant who comes back on another API instance resumes the same Game, and the Opponent sees them leave and return", async () => {
  const first = createApp(testDb.db, auth, testRedis.redis, getLogger("api"), {
    countdownMs: 0,
  }).listen(0);
  const second = createApp(testDb.db, auth, testRedis.redis, getLogger("api"), {
    countdownMs: 0,
  }).listen(0);
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
    creator.send({ type: "event", round: 1, event: { type: "start", at: 10 } });
    opponent.send({ type: "event", round: 1, event: { type: "start", at: 11 } });
    creator.send({ type: "event", round: 1, event: { type: "insert", at: 20, text: "a" } });
    opponent.send({ type: "event", round: 1, event: { type: "insert", at: 21, text: "b" } });
    for (const socket of [opponent, opponent, creator, creator]) await socket.next();

    creator.close();
    const away = await opponent.next();
    const again = await openSocket(socketUrl(second.server?.port, id), creatorCookie);
    const state = await again.next();
    const back = await opponent.next();
    // Already started before the disconnection: a second start is refused, typing goes on.
    again.send({ type: "event", round: 1, event: { type: "start", at: 30 } });
    again.send({ type: "event", round: 1, event: { type: "insert", at: 40, text: "c" } });
    const relayed = await opponent.next();
    again.close();
    opponent.close();

    expect(away).toEqual({
      type: "presence",
      participant: {
        seat: 0,
        name: creatorName,
        avatarUrl: null,
        ornament: unrankedPlate,
        connected: false,
      },
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
      participant: {
        seat: 0,
        name: creatorName,
        avatarUrl: null,
        ornament: unrankedPlate,
        connected: true,
      },
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
    again.send({
      type: "event",
      round: 1,
      event: { type: "insert", at: startAt + 2000, text: "a" },
    });
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
    creator.send({ type: "event", round: 1, event: { type: "start", at: 10 } });
    creator.send({ type: "event", round: 1, event: { type: "addWords", words: ["extra"] } });
    creator.send({ type: "event", round: 1, event: { type: "insert", at: 20, text: "a" } });

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
    creator.send({ type: "event", round: 1, event: { type: "start", at: 10 } });
    creator.send({ type: "event", round: 1, event: { type: "tick", at: 30_010 } });
    creator.send({ type: "event", round: 1, event: { type: "insert", at: 30_020, text: "a" } });
    creator.send({ type: "event", round: 1, event: { type: "tick", at: 31_010 } });

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

type Socket = Awaited<ReturnType<typeof openSocket>>;

const isOfType = <Type extends ServerMessage["type"]>(
  message: ServerMessage,
  type: Type,
): message is Extract<ServerMessage, { type: Type }> => message.type === type;

// Skips what may come before the awaited message: the Opponent's Events, presence changes.
const nextOfType = async <Type extends ServerMessage["type"]>(socket: Socket, type: Type) => {
  for (;;) {
    const message = await socket.next();
    if (isOfType(message, type)) return message;
  }
};
const nextEnd = (socket: Socket) => nextOfType(socket, "end");
const nextRoundEnd = (socket: Socket) => nextOfType(socket, "roundEnd");

// Everything a socket receives up to the end of the Duel, the end included.
const messagesUntilEnd = async (socket: Socket) => {
  const messages: ServerMessage[] = [];
  for (;;) {
    const message = await socket.next();
    messages.push(message);
    if (message.type === "end") return messages;
  }
};

// The Countdown of `round` as both Participants receive it, waited through to its Start.
const awaitStart = async (sockets: readonly Socket[], round: number) => {
  const countdowns = [];
  for (const socket of sockets) countdowns.push(await nextOfType(socket, "countdown"));
  const [countdown] = countdowns;
  if (!countdown || countdowns.some((other) => other.round !== round))
    throw new Error(`Expected the Countdown of Round ${round}`);
  await Bun.sleep(Math.max(0, countdown.startAt - Date.now()));
  return countdown;
};

// A whole Game in three Events at most: started, `typed` when given, and ended by a Tick stamped
// 30 seconds ahead, so that no test waits for it.
const playGame = (socket: Socket, round: number, typed?: string) => {
  socket.send({ type: "event", round, event: { type: "start", at: 10 } });
  if (typed !== undefined)
    socket.send({ type: "event", round, event: { type: "insert", at: 1010, text: typed } });
  socket.send({ type: "event", round, event: { type: "tick", at: 30_010 } });
};

// Plays `round` from its Start to its end. A Participant given the Target words types the first
// one, which wins the Round against one who types nothing.
const playRound = async (
  [creator, opponent]: readonly [Socket, Socket],
  round: number,
  typing: { readonly creator?: readonly string[]; readonly opponent?: readonly string[] } = {},
) => {
  playGame(creator, round, typing.creator && `${typing.creator[0]} `);
  playGame(opponent, round, typing.opponent && `${typing.opponent[0]} `);
  const ends = [await nextRoundEnd(creator), await nextRoundEnd(opponent)] as const;
  return ends;
};

// Plays the Rounds left after `round`, each won by the creator, until the Duel ends.
const playOut = async (sockets: readonly [Socket, Socket], round: number) => {
  for (let next = round + 1; ; next += 1) {
    const { words } = await awaitStart(sockets, next);
    const [ended] = await playRound(sockets, next, { creator: words });
    if (ended.nextStartAt === null) return nextEnd(sockets[0]);
  }
};

test("once both Games of a Round are finished, both Participants receive both Results and both Outcomes of the Round, and the Start of the next one", async () => {
  const { creator, opponent, words, stop } = await startDuel(0, {}, testDb.db, 400);
  try {
    const [firstWord = ""] = words;
    const before = Date.now();
    const ends = await playRound([creator, opponent], 1, { creator: words });
    const after = Date.now();

    expect(ends[0]).toEqual(ends[1]);
    expect(ends[0]).toMatchObject({
      type: "roundEnd",
      round: 1,
      // The first word and its Separator, exactly typed in half a minute, at 5 characters a word.
      results: [
        { duration: 30, wpm: ((firstWord.length + 1) / 5) * 2, accuracy: 100 },
        { duration: 30, wpm: 0 },
      ],
      outcomes: ["win", "loss"],
    });
    expect(ends[0].nextStartAt).toBeGreaterThanOrEqual(before + 400);
    expect(ends[0].nextStartAt).toBeLessThanOrEqual(after + 400);
  } finally {
    await stop();
  }
});

test("a slower but cleaner Participant has more Points and both Participants receive their win of the Round", async () => {
  const { creator, opponent, words, stop } = await startDuel(0);
  try {
    // About 10 % faster, against a clean Opponent: the reference case of ADR 0012.
    const faster = `${words.slice(0, 10).join(" ")} `;
    const slower = `${words.slice(0, 9).join(" ")} `;
    // An Accuracy between the speed ratio, where WPM × Accuracy would tie, and its square root,
    // where WPM × Accuracy² would: only Accuracy counting twice hands the Round to the cleaner.
    const accuracy = (slower.length / faster.length) ** 0.75;
    const mistakes = Math.round(faster.length * (1 / accuracy - 1));
    playGame(creator, 1, `${faster}${"#".repeat(mistakes)}`);
    playGame(opponent, 1, slower);
    const ends = [await nextRoundEnd(creator), await nextRoundEnd(opponent)] as const;

    expect(ends[0]).toEqual(ends[1]);
    const [sloppy, clean] = ends[0].results;
    expect(sloppy.wpm).toBeGreaterThan(clean.wpm);
    expect(sloppy.wpm * sloppy.accuracy).toBeGreaterThan(clean.wpm * clean.accuracy);
    expect(ends[0].outcomes).toEqual(["loss", "win"]);
  } finally {
    await stop();
  }
});

test("the pause between two Rounds lasts 5 seconds unless the app is given another", async () => {
  const cookies = [
    await signInPlayerWithNickname(uniqueNickname()),
    await signInPlayerWithNickname(uniqueNickname()),
  ] as const;
  const { id } = (await (await createDuel(cookies[0])).json()) as { id: string };
  const creator = await openSocket(duelSocketUrl(id), cookies[0]);
  const opponent = await openSocket(duelSocketUrl(id), cookies[1]);
  try {
    await awaitStart([creator, opponent], 1);
    const before = Date.now();
    const [ended] = await playRound([creator, opponent], 1);
    const after = Date.now();

    // The pause, then the 3 seconds of the Countdown.
    expect(ended.nextStartAt).toBeGreaterThanOrEqual(before + 5000 + 3000);
    expect(ended.nextStartAt).toBeLessThanOrEqual(after + 5000 + 3000);
  } finally {
    creator.close();
    opponent.close();
  }
});

test("the Countdown of the next Round follows the pause on its own, on new Target words", async () => {
  const { creator, opponent, words, stop } = await startDuel(200, {}, testDb.db, 300);
  try {
    const [ended] = await playRound([creator, opponent], 1);
    const silent = await creator.staysSilent(200);
    const countdowns = [await creator.next(), await opponent.next()];
    const receivedAt = Date.now();

    const { nextStartAt } = ended;
    if (nextStartAt === null) throw new Error("Expected a second Round");
    const [countdown] = countdowns;
    if (countdown?.type !== "countdown") throw new Error("Expected the Countdown");
    // Nothing during the pause, then the Countdown, 200 ms before the Start fixed at the end of the Round.
    expect(silent).toBe(true);
    expect(countdowns[1]).toEqual(countdown);
    expect(countdown).toMatchObject({ type: "countdown", round: 2, startAt: nextStartAt });
    expect(receivedAt).toBeGreaterThanOrEqual(nextStartAt - 200);
    expect(receivedAt).toBeLessThan(nextStartAt);
    expect(countdown.words).toHaveLength(DUEL_WORD_COUNT);
    expect(countdown.words).not.toEqual(words);
  } finally {
    await stop();
  }
});

test("a Duel ends as soon as a Participant has won two Rounds: a 2-0 Duel plays no third Round", async () => {
  const { creator, opponent, words, stop } = await startDuel(0);
  try {
    const sockets = [creator, opponent] as const;
    playGame(creator, 1, `${words[0]} `);
    playGame(opponent, 1);
    const second = await awaitStart(sockets, 2);
    playGame(creator, 2, `${second.words[0]} `);
    playGame(opponent, 2);
    const received = [await messagesUntilEnd(creator), await messagesUntilEnd(opponent)] as const;
    const silent = [await creator.staysSilent(300), await opponent.staysSilent(0)];

    for (const messages of received) {
      const roundEnds = messages.filter((message) => message.type === "roundEnd");
      expect(roundEnds).toMatchObject([{ round: 2, outcomes: ["win", "loss"], nextStartAt: null }]);
      expect(messages.filter((message) => message.type === "countdown")).toEqual([]);
      const [roundEnd] = roundEnds;
      expect(messages.at(-1)).toMatchObject({
        type: "end",
        outcomes: ["win", "loss"],
        rounds: [
          { outcomes: ["win", "loss"] },
          { results: roundEnd?.results, outcomes: ["win", "loss"] },
        ],
      });
    }
    expect(received[0].at(-1)).toEqual(received[1].at(-1));
    expect(silent).toEqual([true, true]);
  } finally {
    await stop();
  }
});

test("a drawn Round counts for neither Participant: after three Rounds, the Duel goes to whoever won more", async () => {
  const { creator, opponent, stop } = await startDuel(0);
  try {
    const sockets = [creator, opponent] as const;
    const first = await playRound(sockets, 1);
    const second = await playRound(sockets, 2, { opponent: (await awaitStart(sockets, 2)).words });
    await awaitStart(sockets, 3);
    const third = await playRound(sockets, 3);
    const end = await nextEnd(creator);

    expect(first[0]).toMatchObject({ round: 1, outcomes: ["draw", "draw"] });
    expect(first[0].nextStartAt).not.toBeNull();
    expect(second[0]).toMatchObject({ round: 2, outcomes: ["loss", "win"] });
    // One Round won is not two: the third Round is played.
    expect(second[0].nextStartAt).not.toBeNull();
    expect(third[0]).toMatchObject({ round: 3, outcomes: ["draw", "draw"], nextStartAt: null });
    expect(end).toMatchObject({
      type: "end",
      outcomes: ["loss", "win"],
      rounds: [
        { outcomes: ["draw", "draw"] },
        { outcomes: ["loss", "win"] },
        { outcomes: ["draw", "draw"] },
      ],
    });
  } finally {
    await stop();
  }
});

test("after three Rounds won equally, the Duel is a draw", async () => {
  const { creator, opponent, words, duelId, stop } = await startDuel(0);
  try {
    const sockets = [creator, opponent] as const;
    await playRound(sockets, 1, { creator: words });
    await playRound(sockets, 2, { opponent: (await awaitStart(sockets, 2)).words });
    await awaitStart(sockets, 3);
    const third = await playRound(sockets, 3);
    const ends = [await nextEnd(creator), await nextEnd(opponent)] as const;
    const participants = await testDb.db
      .select()
      .from(duelParticipant)
      .where(eq(duelParticipant.duelId, duelId))
      .orderBy(duelParticipant.seat);

    expect(third[0]).toMatchObject({ round: 3, outcomes: ["draw", "draw"], nextStartAt: null });
    expect(ends[0]).toMatchObject({ type: "end", outcomes: ["draw", "draw"] });
    expect(ends[0].rounds.map((round) => round.outcomes)).toEqual([
      ["win", "loss"],
      ["loss", "win"],
      ["draw", "draw"],
    ]);
    expect(ends[1]).toEqual(ends[0]);
    expect(participants.map((participant) => participant.outcome)).toEqual(["draw", "draw"]);
  } finally {
    await stop();
  }
});

test("a finished Duel is saved once it ends as one Duel of the custom kind, with every Round, its Games and each participant's Outcome of the Duel, a Guest without a Player", async () => {
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
    for (const event of creatorJournal) creator.send({ type: "event", round: 1, event });
    for (const event of guestJournal) opponent.send({ type: "event", round: 1, event });
    const { results } = await nextRoundEnd(creator);
    await nextRoundEnd(opponent);
    const savedAfterFirstRound = await testDb.db.select().from(duel).where(eq(duel.id, duelId));
    const second = await awaitStart([creator, opponent], 2);
    const secondJournals: [GameEvent[], GameEvent[]] = [
      [
        { type: "start", at: 10 },
        { type: "insert", at: 1010, text: `${second.words[0]} ` },
        { type: "tick", at: 30_010 },
      ],
      [
        { type: "start", at: 10 },
        { type: "tick", at: 30_010 },
      ],
    ];
    const [secondEnded] = await playRound([creator, opponent], 2, { creator: second.words });
    await nextEnd(creator);
    await nextEnd(opponent);

    const duels = await testDb.db.select().from(duel).where(eq(duel.id, duelId));
    const rounds = await testDb.db.select().from(duelRound).where(eq(duelRound.duelId, duelId));
    const games = await testDb.db
      .select()
      .from(duelGame)
      .where(eq(duelGame.duelId, duelId))
      .orderBy(duelGame.round, duelGame.seat);
    const participants = await testDb.db
      .select()
      .from(duelParticipant)
      .where(eq(duelParticipant.duelId, duelId))
      .orderBy(duelParticipant.seat);

    const endedAt = duels[0]?.endedAt ?? new Date(Number.NaN);
    expect(endedAt.getTime()).toBeGreaterThanOrEqual(startAt);
    expect(duels).toEqual([
      {
        id: duelId,
        kind: "custom",
        config: { mode: "time", seconds: 30 },
        startedAt: new Date(startAt),
        endedAt,
      },
    ]);
    // Nothing is written before the Duel ends.
    expect(savedAfterFirstRound).toEqual([]);
    const firstEndedAt = rounds[0]?.endedAt ?? new Date(Number.NaN);
    expect(firstEndedAt.getTime()).toBeGreaterThanOrEqual(startAt);
    expect(firstEndedAt.getTime()).toBeLessThanOrEqual(second.startAt);
    expect(rounds).toEqual([
      { duelId, round: 1, words: [...words], startedAt: new Date(startAt), endedAt: firstEndedAt },
      {
        duelId,
        round: 2,
        words: [...second.words],
        startedAt: new Date(second.startAt),
        endedAt,
      },
    ]);
    expect(games).toEqual([
      { duelId, round: 1, seat: 0, result: results[0], journal: creatorJournal, outcome: "win" },
      { duelId, round: 1, seat: 1, result: results[1], journal: guestJournal, outcome: "loss" },
      {
        duelId,
        round: 2,
        seat: 0,
        result: secondEnded.results[0],
        journal: secondJournals[0],
        outcome: "win",
      },
      {
        duelId,
        round: 2,
        seat: 1,
        result: secondEnded.results[1],
        journal: secondJournals[1],
        outcome: "loss",
      },
    ]);
    // A Custom Duel keeps no Standing: the ranked columns stay empty.
    const noStanding = {
      mmrBefore: null,
      mmrAfter: null,
      duelsPlayedBefore: null,
      duelsPlayedAfter: null,
      ladderIndexBefore: null,
      lpBefore: null,
      ladderIndexAfter: null,
      lpAfter: null,
      lpDelta: null,
      rankChange: null,
    };
    expect(participants).toEqual([
      { duelId, seat: 0, playerId: player.id, outcome: "win", ...noStanding },
      { duelId, seat: 1, playerId: null, outcome: "loss", ...noStanding },
    ]);
  } finally {
    await stop();
  }
});

test("a Participant who comes back after the end of the Duel is handed the end again", async () => {
  const { creator, opponent, words, reopenCreator, stop } = await startDuel(0);
  try {
    await playRound([creator, opponent], 1, { creator: words });
    const end = await playOut([creator, opponent], 1);

    creator.close();
    const again = await reopenCreator();
    const received = await messagesUntilEnd(again);
    again.close();

    // The state, with the Round the Duel ended in and every Round finished, then the end again.
    expect(received).toEqual([
      expect.objectContaining({ type: "state", round: 2, rounds: end.rounds }),
      end,
    ]);
  } finally {
    await stop();
  }
});

test("replaying a saved journal gives the saved Result", async () => {
  const { creator, opponent, duelId, words, stop } = await startDuel(0);
  try {
    creator.send({ type: "event", round: 1, event: { type: "start", at: 10 } });
    creator.send({ type: "event", round: 1, event: { type: "insert", at: 900, text: "x" } });
    creator.send({ type: "event", round: 1, event: { type: "delete", at: 1000, unit: "char" } });
    creator.send({
      type: "event",
      round: 1,
      event: { type: "insert", at: 1500, text: `${words[0]} ` },
    });
    creator.send({ type: "event", round: 1, event: { type: "tick", at: 30_010 } });
    opponent.send({ type: "event", round: 1, event: { type: "start", at: 11 } });
    opponent.send({ type: "event", round: 1, event: { type: "tick", at: 30_011 } });
    await nextRoundEnd(creator);
    await nextRoundEnd(opponent);
    await playOut([creator, opponent], 1);

    const rounds = await testDb.db.select().from(duelRound).where(eq(duelRound.duelId, duelId));
    const games = await testDb.db.select().from(duelGame).where(eq(duelGame.duelId, duelId));

    expect(rounds[0]?.words).toEqual([...words]);
    expect(games).toHaveLength(4);
    for (const game of games) {
      const played = rounds.find((round) => round.round === game.round)?.words ?? [];
      const replayed = game.journal.reduce(applyEvent, createGame(DUEL_GAME_CONFIG, played));
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
  alone.send({ type: "event", round: 1, event: { type: "start", at: 10 } });
  alone.send({ type: "event", round: 1, event: { type: "tick", at: 30_010 } });
  await Bun.sleep(300);
  alone.close();

  expect(await testDb.db.select().from(duel).where(eq(duel.id, id))).toEqual([]);
  expect(await testDb.db.select().from(duelRound).where(eq(duelRound.duelId, id))).toEqual([]);
  expect(await testDb.db.select().from(duelGame).where(eq(duelGame.duelId, id))).toEqual([]);
  expect(
    await testDb.db.select().from(duelParticipant).where(eq(duelParticipant.duelId, id)),
  ).toEqual([]);
});

test("a Game whose client goes silent is ended by the server 2 seconds after the deadline, at its start plus 30 seconds", async () => {
  const { creator, opponent, startAt, words, stop } = await startDuel(0);
  try {
    const [firstWord = ""] = words;
    creator.send({ type: "event", round: 1, event: { type: "start", at: 10 } });
    creator.send({ type: "event", round: 1, event: { type: "tick", at: 30_010 } });
    opponent.send({ type: "event", round: 1, event: { type: "start", at: 500 } });
    opponent.send({
      type: "event",
      round: 1,
      event: { type: "insert", at: 1500, text: `${firstWord} ` },
    });

    const end = await nextRoundEnd(creator);

    expect(Date.now()).toBeGreaterThanOrEqual(startAt + 32_000);
    expect(end).toMatchObject({
      round: 1,
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

test("the time a Participant spends away counts as Inactivity in their Result", async () => {
  const { creator, opponent, reopenCreator, words, stop } = await startDuel(0);
  try {
    const [firstWord = "", secondWord = ""] = words;
    creator.send({ type: "event", round: 1, event: { type: "start", at: 10 } });
    creator.send({
      type: "event",
      round: 1,
      event: { type: "insert", at: 1010, text: `${firstWord} ` },
    });
    await opponent.next();
    await opponent.next();
    creator.close();
    await opponent.next();

    // Back 24 seconds later on the Participant's clock, which ran on meanwhile.
    const again = await reopenCreator();
    await again.next();
    again.send({
      type: "event",
      round: 1,
      event: { type: "insert", at: 25_010, text: `${secondWord} ` },
    });
    again.send({ type: "event", round: 1, event: { type: "tick", at: 30_010 } });
    opponent.send({ type: "event", round: 1, event: { type: "start", at: 11 } });
    opponent.send({ type: "event", round: 1, event: { type: "tick", at: 30_011 } });
    const { results } = await nextRoundEnd(again);
    again.close();

    // Typing in the first and the 25th seconds only: the 28 others, mostly away, are inactive.
    expect(results[0]).toMatchObject({ duration: 30, inactiveSeconds: 28 });
  } finally {
    await stop();
  }
});

test("a Participant who comes back after the deadline, while the server is still ending their silent Game, finds the Round over", async () => {
  const { creator, opponent, startAt, reopenCreator, stop } = await startDuel(0);
  try {
    creator.send({ type: "event", round: 1, event: { type: "start", at: 10 } });
    await opponent.next();
    creator.close();
    await opponent.next();
    opponent.send({ type: "event", round: 1, event: { type: "start", at: 11 } });
    opponent.send({ type: "event", round: 1, event: { type: "tick", at: 30_011 } });

    // Past the deadline, but within the grace the server gives a silent client before ending its Game.
    await Bun.sleep(startAt + DUEL_GAME_CONFIG.seconds * 1000 + 500 - Date.now());
    const again = await reopenCreator();
    const end = await nextRoundEnd(again);
    again.close();

    expect(end).toMatchObject({
      round: 1,
      results: [{ duration: 30 }, { duration: 30 }],
      outcomes: ["draw", "draw"],
    });
  } finally {
    await stop();
  }
}, 40_000);

test("two Participants on two API instances sharing Redis receive each other's Events", async () => {
  const first = createApp(testDb.db, auth, testRedis.redis, getLogger("api"), {
    countdownMs: 0,
  }).listen(0);
  const second = createApp(testDb.db, auth, testRedis.redis, getLogger("api"), {
    countdownMs: 0,
  }).listen(0);
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

    creator.send({ type: "event", round: 1, event: { type: "start", at: 10 } });
    opponent.send({ type: "event", round: 1, event: { type: "start", at: 11 } });
    creator.send({ type: "event", round: 1, event: { type: "insert", at: 20, text: "a" } });
    opponent.send({ type: "event", round: 1, event: { type: "insert", at: 21, text: "b" } });
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

test("with two API instances on one Redis, each Round ends exactly once for both Participants, and the Duel is finalised and saved exactly once", async () => {
  const options = { countdownMs: 0, roundPauseMs: 0 };
  const first = createApp(testDb.db, auth, testRedis.redis, getLogger("api"), options).listen(0);
  const second = createApp(testDb.db, auth, testRedis.redis, getLogger("api"), options).listen(0);
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

    // Both final Ticks of each Round at once, so that both instances see both Games ended.
    const received: [ServerMessage[], ServerMessage[]] = [[], []];
    const sockets = [creator, opponent] as const;
    for (const round of [1, 2, 3]) {
      for (const socket of sockets) playGame(socket, round);
      for (const seat of [0, 1] as const) {
        // Up to what ends the Round for this Participant: the next Countdown, or the end of the Duel.
        const last = round === 3 ? "end" : "countdown";
        for (;;) {
          const message = await sockets[seat].next();
          received[seat].push(message);
          if (message.type === last) break;
        }
      }
    }
    const silent = [await creator.staysSilent(300), await opponent.staysSilent(0)];
    creator.close();
    opponent.close();

    for (const messages of received) {
      const roundEnds = messages.filter((message) => message.type === "roundEnd");
      expect(roundEnds.map((roundEnd) => roundEnd.round)).toEqual([1, 2, 3]);
      const countdowns = messages.filter((message) => message.type === "countdown");
      expect(countdowns.map((countdown) => countdown.round)).toEqual([2, 3]);
      expect(messages.filter((message) => message.type === "end")).toMatchObject([
        { outcomes: ["draw", "draw"], rounds: roundEnds.map(({ results }) => ({ results })) },
      ]);
    }
    expect(received[0].filter((message) => message.type === "roundEnd")).toEqual(
      received[1].filter((message) => message.type === "roundEnd"),
    );
    expect(silent).toEqual([true, true]);
    expect(await testDb.db.select().from(duel).where(eq(duel.id, id))).toHaveLength(1);
    expect(await testDb.db.select().from(duelRound).where(eq(duelRound.duelId, id))).toHaveLength(
      3,
    );
    expect(await testDb.db.select().from(duelGame).where(eq(duelGame.duelId, id))).toHaveLength(6);
  } finally {
    await first.stop(true);
    await second.stop(true);
  }
});

// The Opponent's Event a socket is relayed next, with the timestamp the server gave it.
const nextOpponentEventAt = async (socket: Awaited<ReturnType<typeof openSocket>>) => {
  const message = await socket.next();
  if (message.type !== "opponentEvent" || message.event.type === "addWords")
    throw new Error(`Expected a stamped Event of the Opponent, got ${message.type}`);
  return message.event.at;
};

test("an Event stamped behind its receipt, inside the tolerance, is journaled with the timestamp its client sent", async () => {
  const { creator, opponent, reopenCreator, stop } = await startDuel(0);
  try {
    creator.send({ type: "event", round: 1, event: { type: "start", at: 10 } });
    await opponent.next();
    // Half a second passes on the server, 10 milliseconds on the client's stamps.
    await Bun.sleep(500);
    creator.send({ type: "event", round: 1, event: { type: "insert", at: 20, text: "a" } });
    const relayed = await opponent.next();
    creator.close();
    await opponent.next();
    const again = await reopenCreator();
    const state = await again.next();
    again.close();

    expect(relayed).toEqual({
      type: "opponentEvent",
      event: { type: "insert", at: 20, text: "a" },
    });
    expect(state).toMatchObject({
      type: "state",
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

test("an Event stamped more than 1 second behind its receipt is kept, and relayed, journaled and saved with its timestamp moved up", async () => {
  const { creator, opponent, duelId, startAt, words, reopenCreator, stop } = await startDuel(0);
  try {
    const text = `${words[0]} `;
    creator.send({ type: "event", round: 1, event: { type: "start", at: 10 } });
    opponent.send({ type: "event", round: 1, event: { type: "start", at: 11 } });
    await opponent.next();
    // A second and a half passes on the server, 10 milliseconds on the client's stamps.
    await Bun.sleep(startAt + 1500 - Date.now());
    const sentAt = Date.now();
    creator.send({ type: "event", round: 1, event: { type: "insert", at: 20, text } });
    const movedAt = await nextOpponentEventAt(opponent);
    const relayedAt = Date.now();
    creator.close();
    await opponent.next();
    const again = await reopenCreator();
    const state = await again.next();
    again.send({ type: "event", round: 1, event: { type: "tick", at: 30_010 } });
    opponent.send({ type: "event", round: 1, event: { type: "tick", at: 30_011 } });
    const { results } = await nextRoundEnd(again);
    await nextRoundEnd(opponent);
    await playOut([again, opponent], 1);
    again.close();
    const [saved] = await testDb.db
      .select()
      .from(duelGame)
      .where(and(eq(duelGame.duelId, duelId), eq(duelGame.round, 1), eq(duelGame.seat, 0)));

    // 1 second behind the receipt, which the test only knows between its sending and its relay.
    expect(movedAt).toBeGreaterThanOrEqual(10 + sentAt - startAt - 1000);
    expect(movedAt).toBeLessThanOrEqual(10 + relayedAt - startAt - 1000);
    const journal: GameEvent[] = [
      { type: "start", at: 10 },
      { type: "insert", at: movedAt, text },
    ];
    expect(state).toMatchObject({
      type: "state",
      journals: [journal, [{ type: "start", at: 11 }]],
    });
    expect(saved?.journal).toEqual([...journal, { type: "tick", at: 30_010 }]);
    // The word was typed: only its instant moved.
    expect(results[0]).toMatchObject({ duration: 30, wpm: (text.length / 5) * 2 });
    const replayed = (saved?.journal ?? []).reduce(applyEvent, createGame(DUEL_GAME_CONFIG, words));
    expect(getResult(replayed)).toEqual(results[0]);
    expect(saved?.result).toEqual(results[0]);
  } finally {
    await stop();
  }
});

test("Events moved up never land after a later one, and a timestamp ahead of its receipt is left alone", async () => {
  const { creator, opponent, startAt, stop } = await startDuel(0);
  try {
    creator.send({ type: "event", round: 1, event: { type: "start", at: 10 } });
    await opponent.next();
    await Bun.sleep(startAt + 1500 - Date.now());
    creator.send({ type: "event", round: 1, event: { type: "insert", at: 30, text: "a" } });
    await Bun.sleep(50);
    creator.send({ type: "event", round: 1, event: { type: "insert", at: 20, text: "b" } });
    creator.send({ type: "event", round: 1, event: { type: "tick", at: 40 } });
    creator.send({ type: "event", round: 1, event: { type: "insert", at: 20_000, text: "c" } });
    const relayedAts = [
      await nextOpponentEventAt(opponent),
      await nextOpponentEventAt(opponent),
      await nextOpponentEventAt(opponent),
      await nextOpponentEventAt(opponent),
    ];

    expect(relayedAts[0]).toBeGreaterThan(40);
    expect(relayedAts).toEqual(relayedAts.toSorted((a, b) => a - b));
    expect(relayedAts[3]).toBe(20_000);
  } finally {
    await stop();
  }
});

test("a start sent early inside the accepted window gains no typing time: its Events are bounded from its receipt", async () => {
  const { creator, opponent, startAt, stop } = await startDuel(800);
  try {
    const startSentAt = Date.now();
    creator.send({ type: "event", round: 1, event: { type: "start", at: 10 } });
    await opponent.next();
    const startRelayedAt = Date.now();
    await Bun.sleep(startSentAt + 2000 - Date.now());
    const sentAt = Date.now();
    creator.send({ type: "event", round: 1, event: { type: "insert", at: 20, text: "a" } });
    const movedAt = await nextOpponentEventAt(opponent);
    const relayedAt = Date.now();

    expect(startRelayedAt).toBeLessThan(startAt);
    // Counted from the receipt of the start: from the announced Start, it would land earlier.
    expect(movedAt).toBeGreaterThanOrEqual(10 + sentAt - startRelayedAt - 1000);
    expect(movedAt).toBeLessThanOrEqual(10 + relayedAt - startSentAt - 1000);
  } finally {
    await stop();
  }
});

test("a Participant who comes back on another API instance is bounded against the same anchor", async () => {
  const first = createApp(testDb.db, auth, testRedis.redis, getLogger("api"), {
    countdownMs: 0,
  }).listen(0);
  const second = createApp(testDb.db, auth, testRedis.redis, getLogger("api"), {
    countdownMs: 0,
  }).listen(0);
  const socketUrl = (port: number | undefined, duelId: string) =>
    `ws://localhost:${port}/api/duels/${duelId}/socket`;
  try {
    const creatorCookie = await signInPlayerWithNickname(uniqueNickname());
    const opponentCookie = await signInPlayerWithNickname(uniqueNickname());
    const { id } = (await (await createDuel(creatorCookie)).json()) as { id: string };
    const creator = await openSocket(socketUrl(first.server?.port, id), creatorCookie);
    await creator.next();
    const opponent = await openSocket(socketUrl(second.server?.port, id), opponentCookie);
    await opponent.next();
    const countdown = await opponent.next();
    const startAt = countdown.type === "countdown" ? countdown.startAt : Number.NaN;
    await creator.next();
    await creator.next();
    creator.send({ type: "event", round: 1, event: { type: "start", at: 10 } });
    await opponent.next();

    creator.close();
    await opponent.next();
    await Bun.sleep(startAt + 1500 - Date.now());
    const again = await openSocket(socketUrl(second.server?.port, id), creatorCookie);
    await again.next();
    await opponent.next();
    const sentAt = Date.now();
    again.send({ type: "event", round: 1, event: { type: "insert", at: 20, text: "a" } });
    const movedAt = await nextOpponentEventAt(opponent);
    const relayedAt = Date.now();
    again.close();
    opponent.close();

    expect(movedAt).toBeGreaterThanOrEqual(10 + sentAt - startAt - 1000);
    expect(movedAt).toBeLessThanOrEqual(10 + relayedAt - startAt - 1000);
  } finally {
    await first.stop(true);
    await second.stop(true);
  }
});

test("the final Tick the server applies to a silent Game is stamped no earlier than the last Event of its journal", async () => {
  const { creator, opponent, duelId, stop } = await startDuel(0);
  try {
    creator.send({ type: "event", round: 1, event: { type: "start", at: 10 } });
    creator.send({ type: "event", round: 1, event: { type: "tick", at: 30_010 } });
    opponent.send({ type: "event", round: 1, event: { type: "start", at: 500 } });
    // Stamped past the 30 seconds of the Game, and never followed by a Tick.
    opponent.send({ type: "event", round: 1, event: { type: "insert", at: 36_500, text: "a" } });

    const { results } = await nextRoundEnd(creator);
    await nextRoundEnd(opponent);
    await playOut([creator, opponent], 1);
    const [saved] = await testDb.db
      .select()
      .from(duelGame)
      .where(and(eq(duelGame.duelId, duelId), eq(duelGame.round, 1), eq(duelGame.seat, 1)));

    expect(saved?.journal.at(-1)).toEqual({ type: "tick", at: 36_500 });
    expect(results[1]).toMatchObject({ duration: 36 });
  } finally {
    await stop();
  }
}, 40_000);

test("a Participant away at the Start of a Round has their Game started at that Start, and their absence counts as Inactivity", async () => {
  const { creator, opponent, words, reopenCreator, stop } = await startDuel(0);
  try {
    await playRound([creator, opponent], 1, { creator: words });
    creator.close();
    // Announced to the Opponent alone: the Round does not wait for the Participant who left.
    const second = await awaitStart([opponent], 2);
    playGame(opponent, 2);
    await Bun.sleep(second.startAt + START_WINDOW_MS + 100 - Date.now());

    const again = await reopenCreator();
    const state = await again.next();
    // The Game the server started runs on its clock: this Tick ends it 30 seconds after the Start.
    again.send({ type: "event", round: 2, event: { type: "tick", at: second.startAt + 30_000 } });
    const ended = await nextRoundEnd(again);
    again.close();

    expect(state).toMatchObject({
      type: "state",
      round: 2,
      startAt: second.startAt,
      journals: [[{ type: "start", at: second.startAt }], [{ type: "start", at: 10 }, {}]],
    });
    expect(ended).toMatchObject({
      round: 2,
      results: [{ duration: 30, wpm: 0, inactiveSeconds: 30 }, { duration: 30 }],
    });
  } finally {
    await stop();
  }
});

test("a Participant who comes back during a later Round gets the finished Rounds, the current Round and their Game, and types on", async () => {
  const { creator, opponent, words, reopenCreator, stop } = await startDuel(0);
  try {
    const [first] = await playRound([creator, opponent], 1, { creator: words });
    const second = await awaitStart([creator, opponent], 2);
    creator.send({ type: "event", round: 2, event: { type: "start", at: 10 } });
    creator.send({ type: "event", round: 2, event: { type: "insert", at: 20, text: "a" } });
    await nextOfType(opponent, "opponentEvent");
    await nextOfType(opponent, "opponentEvent");
    creator.close();

    const again = await reopenCreator();
    const state = await again.next();
    const countdown = await again.next();
    again.send({ type: "event", round: 2, event: { type: "insert", at: 30, text: "b" } });
    const relayed = await nextOfType(opponent, "opponentEvent");
    again.close();

    expect(state).toMatchObject({
      type: "state",
      seat: 0,
      round: 2,
      rounds: [{ results: first.results, outcomes: ["win", "loss"] }],
      startAt: second.startAt,
      words: second.words,
      journals: [
        [
          { type: "start", at: 10 },
          { type: "insert", at: 20, text: "a" },
        ],
        [],
      ],
    });
    expect(countdown).toEqual(second);
    expect(relayed.event).toEqual({ type: "insert", at: 30, text: "b" });
  } finally {
    await stop();
  }
});

test("a Participant who comes back between two Rounds gets the Round that just ended and the coming Start, then the Countdown with the Target words, and plays the Round", async () => {
  const { creator, opponent, words, reopenCreator, stop } = await startDuel(
    100,
    {},
    testDb.db,
    600,
  );
  try {
    const [first] = await playRound([creator, opponent], 1, { creator: words });
    creator.close();

    const again = await reopenCreator();
    const state = await again.next();
    const second = await awaitStart([again, opponent], 2);
    const [ended] = await playRound([again, opponent], 2, { creator: second.words });
    await nextEnd(again);
    again.close();

    expect(state).toMatchObject({
      type: "state",
      seat: 0,
      round: 2,
      rounds: [{ results: first.results, outcomes: ["win", "loss"] }],
      startAt: first.nextStartAt,
      // Held back until the Countdown of the Round.
      words: null,
      journals: [[], []],
    });
    expect(second).toMatchObject({ round: 2, startAt: first.nextStartAt });
    expect(second.words).toHaveLength(DUEL_WORD_COUNT);
    expect(ended).toMatchObject({ round: 2, outcomes: ["win", "loss"], nextStartAt: null });
  } finally {
    await stop();
  }
});
