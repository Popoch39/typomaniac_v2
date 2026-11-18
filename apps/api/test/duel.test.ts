import { afterAll, expect, test } from "bun:test";
import { DUEL_WORD_COUNT } from "@repo/duel-engine";
import { count } from "drizzle-orm";
import { createApp } from "../src/app.ts";
import { user } from "../src/db/schema.ts";
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

test("the same Guest opening a Duel twice is refused its other seat, and gets their own back", async () => {
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

  const twice = await requestUpgrade(duelSocketUrl(id), guestCookie);
  seated.close();
  await opponent.next();
  const again = await openSocket(duelSocketUrl(id), guestCookie);
  const state = await again.next();
  again.close();
  opponent.close();

  expect(twice.status).toBe(409);
  expect(await twice.json()).toEqual({ code: "ALREADY_SEATED" });
  expect(state).toMatchObject({ type: "state", seat: 0 });
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
