import { afterAll, expect, test } from "bun:test";
import type { ClientMessage, ServerMessage } from "@repo/duel-engine";
import { getLogger } from "@repo/logger";
import type { QueueClientMessage, QueueServerMessage } from "@repo/matchmaking-engine";
import { createApp, type AppOptions } from "../src/app.ts";
import { tickMatchmaker } from "../src/modules/queue/service.ts";
import type { Redis } from "../src/redis/client.ts";
import { createTestAuth, signInPlayerWithNickname } from "./helpers/auth.ts";
import { createTestDb } from "./helpers/db.ts";
import { createTestRedis } from "./helpers/redis.ts";
import { openSocket, openSocketOf } from "./helpers/socket.ts";

const testDb = await createTestDb();
const auth = createTestAuth(testDb.db);
const cleanups: (() => Promise<void>)[] = [];
afterAll(async () => {
  for (const cleanup of cleanups.reverse()) await cleanup();
  await testDb.drop();
});

type FriendState = "online" | "inDuel" | "offline";
type PlayerServerMessage =
  | { type: "onlineCount"; count: number }
  | { type: "friendStates"; friends: { playerId: string; state: FriendState }[] }
  | { type: "friendState"; playerId: string; state: FriendState }
  | { type: "friendRequestReceived"; playerId: string }
  | { type: "friendRequestSent"; playerId: string }
  | { type: "friendRequestAccepted"; playerId: string }
  | { type: "friendRequestRemoved"; playerId: string }
  | { type: "friendRemoved"; playerId: string };

// Each test runs in its own Redis namespace, so the Players of another test are not Online here.
const createRedis = async () => {
  const testRedis = await createTestRedis();
  cleanups.push(testRedis.drop);
  return testRedis.redis;
};

// Listening on an ephemeral port: the in-process request seam cannot upgrade a connection.
const startInstance = (redis: Redis, options: AppOptions = {}) => {
  const app = createApp(testDb.db, auth, redis, getLogger("api"), options).listen(0);
  cleanups.push(async () => {
    await app.stop(true);
  });
  return { origin: `http://localhost:${app.server?.port}`, redis };
};
type Instance = ReturnType<typeof startInstance>;

const call = (instance: Instance, method: string, path: string, cookie: string, body?: unknown) =>
  fetch(`${instance.origin}${path}`, {
    method,
    headers: { cookie, ...(body === undefined ? {} : { "content-type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const signIn = async (instance: Instance) => {
  const { player, cookie } = await signInPlayerWithNickname(auth, instance.origin);
  return { id: player.id, cookie };
};
type Account = Awaited<ReturnType<typeof signIn>>;

const sendRequest = async (instance: Instance, from: Account, to: Account) => {
  const response = await call(instance, "POST", "/api/friends/requests", from.cookie, {
    playerId: to.id,
  });
  expect(response.status).toBe(200);
};

const befriend = async (instance: Instance, one: Account, other: Account) => {
  await sendRequest(instance, one, other);
  const accepted = await call(
    instance,
    "POST",
    `/api/friends/requests/${one.id}/accept`,
    other.cookie,
  );
  expect(accepted.status).toBe(204);
};

// A tab of the Player, whose Online counts are skipped: they change with every Player of the test.
const openTab = async (instance: Instance, { cookie }: Account) => {
  const socket = await openSocketOf<PlayerServerMessage, unknown>(
    `${instance.origin.replace(/^http/, "ws")}/api/online/socket`,
    cookie,
  );
  const next = async (): Promise<PlayerServerMessage> => {
    for (;;) {
      const message = await socket.next();
      if (message.type !== "onlineCount") return message;
    }
  };
  // Whether nothing but Online counts arrives for that long.
  const staysSilent = async (ms: number) => {
    const settled = await Promise.race([next(), Bun.sleep(ms).then(() => null)]);
    return settled === null;
  };
  return { ...socket, next, staysSilent };
};

// A tab opened and told the states of the Player's Friends, which every new tab is told first.
const openToldTab = async (instance: Instance, account: Account) => {
  const tab = await openTab(instance, account);
  const told = await tab.next();
  if (told.type !== "friendStates") throw new Error(`Expected friendStates, got ${told.type}`);
  return Object.assign(tab, { told });
};

const byId = (friends: { playerId: string; state: FriendState }[]) =>
  [...friends].sort((one, other) => one.playerId.localeCompare(other.playerId));

test("a Player opening the socket is told the state of each Friend, and of nobody else", async () => {
  const instance = startInstance(await createRedis());
  const [ada, bob, cid, stranger] = [
    await signIn(instance),
    await signIn(instance),
    await signIn(instance),
    await signIn(instance),
  ];
  await befriend(instance, ada, bob);
  await befriend(instance, cid, ada);
  const bobTab = await openToldTab(instance, bob);
  const strangerTab = await openToldTab(instance, stranger);

  const adaTab = await openToldTab(instance, ada);

  expect(byId(adaTab.told.friends)).toEqual(
    byId([
      { playerId: bob.id, state: "online" },
      { playerId: cid.id, state: "offline" },
    ]),
  );
  for (const tab of [adaTab, bobTab, strangerTab]) tab.close();
});

test("a Friend opening their first tab is pushed as Online to every tab of the Player, and their second tab pushes nothing", async () => {
  const instance = startInstance(await createRedis());
  const [ada, bob] = [await signIn(instance), await signIn(instance)];
  await befriend(instance, ada, bob);
  const adaTabs = [await openToldTab(instance, ada), await openToldTab(instance, ada)];

  const bobTab = await openToldTab(instance, bob);

  for (const tab of adaTabs)
    expect(await tab.next()).toEqual({ type: "friendState", playerId: bob.id, state: "online" });
  const bobSecondTab = await openToldTab(instance, bob);
  for (const tab of adaTabs) expect(await tab.staysSilent(150)).toBe(true);
  for (const tab of [...adaTabs, bobTab, bobSecondTab]) tab.close();
});

// The window is shortened: a Friend stays Online through a reload, and goes offline once it passes.
test("a Friend closing their last tab is pushed as offline once the Online window has passed", async () => {
  const instance = startInstance(await createRedis(), { online: { windowMs: 150 } });
  const [ada, bob] = [await signIn(instance), await signIn(instance)];
  await befriend(instance, ada, bob);
  const bobTabs = [await openToldTab(instance, bob), await openToldTab(instance, bob)];
  const adaTab = await openToldTab(instance, ada);

  bobTabs[0]?.close();
  expect(await adaTab.staysSilent(300)).toBe(true);
  bobTabs[1]?.close();

  expect(await adaTab.next()).toEqual({ type: "friendState", playerId: bob.id, state: "offline" });
  adaTab.close();
});

test("a Player's state is pushed only to their Friends", async () => {
  const instance = startInstance(await createRedis());
  const [ada, bob, stranger] = [
    await signIn(instance),
    await signIn(instance),
    await signIn(instance),
  ];
  await befriend(instance, ada, bob);
  const adaTab = await openToldTab(instance, ada);
  const strangerTab = await openToldTab(instance, stranger);

  const bobTab = await openToldTab(instance, bob);

  expect(await adaTab.next()).toEqual({ type: "friendState", playerId: bob.id, state: "online" });
  expect(await strangerTab.staysSilent(150)).toBe(true);
  for (const tab of [adaTab, bobTab, strangerTab]) tab.close();
});

test("a Friend whose tab sits on another instance is pushed to the Player all the same", async () => {
  const redis = await createRedis();
  const [one, other] = [startInstance(redis), startInstance(redis)];
  const [ada, bob] = [await signIn(one), await signIn(one)];
  await befriend(one, ada, bob);
  const adaTab = await openToldTab(one, ada);

  const bobTab = await openToldTab(other, bob);

  expect(await adaTab.next()).toEqual({ type: "friendState", playerId: bob.id, state: "online" });
  adaTab.close();
  bobTab.close();
});

// Duels of these tests start at once and follow one another without a pause.
const quickDuels = { countdownMs: 0, roundPauseMs: 0 };

const createCustomDuel = async (instance: Instance, creator: Account) => {
  const response = await call(instance, "POST", "/api/duels", creator.cookie);
  expect(response.status).toBe(201);
  return ((await response.json()) as { id: string }).id;
};

type DuelSocket = Awaited<ReturnType<typeof openSocket>>;

const nextOfType = async <Type extends ServerMessage["type"]>(socket: DuelSocket, type: Type) => {
  for (;;) {
    const message = await socket.next();
    if (message.type === type) return message as Extract<ServerMessage, { type: Type }>;
  }
};

const takeSeat = async (instance: Instance, duelId: string, { cookie }: Account) => {
  const socket = await openSocket(
    `${instance.origin.replace(/^http/, "ws")}/api/duels/${duelId}/socket`,
    cookie,
  );
  await nextOfType(socket, "state");
  return socket;
};

// Each character is a key going down, its insert and the key going up, as the game's client sends it.
const typeWord = (
  socket: { send: (message: ClientMessage) => void },
  round: number,
  word: string,
) => {
  for (const [offset, char] of `${word} `.split("").entries()) {
    const code = char === " " ? "Space" : `Key${char.toUpperCase()}`;
    const at = 1010 + offset * 100;
    socket.send({ type: "event", round, event: { type: "keyDown", at, code } });
    socket.send({ type: "event", round, event: { type: "insert", at: at + 10, text: char } });
    socket.send({ type: "event", round, event: { type: "keyUp", at: at + 60, code } });
  }
};

// Plays the Duel to its end: the first socket types the first Target word of each Round, the other
// nothing, and every Game ends on a Tick stamped 30 seconds ahead.
const playToEnd = async (winner: DuelSocket, loser: DuelSocket) => {
  for (let round = 1; round <= 2; round++) {
    const countdown = await nextOfType(winner, "countdown");
    await nextOfType(loser, "countdown");
    await Bun.sleep(Math.max(0, countdown.startAt - Date.now()));
    for (const socket of [winner, loser]) {
      socket.send({ type: "event", round, event: { type: "start", at: 10 } });
      if (socket === winner) typeWord(socket, round, countdown.words[0] ?? "");
      socket.send({ type: "event", round, event: { type: "tick", at: 30_010 } });
    }
    await Promise.all([nextOfType(winner, "roundEnd"), nextOfType(loser, "roundEnd")]);
  }
  await Promise.all([nextOfType(winner, "end"), nextOfType(loser, "end")]);
};

test("a Friend seated in a Custom Duel is pushed as In a Duel, and as Online once it has ended", async () => {
  const instance = startInstance(await createRedis(), { duel: quickDuels });
  const [ada, bob, opponent] = [
    await signIn(instance),
    await signIn(instance),
    await signIn(instance),
  ];
  await befriend(instance, ada, bob);
  const bobTab = await openToldTab(instance, bob);
  const adaTab = await openToldTab(instance, ada);
  const duelId = await createCustomDuel(instance, bob);

  const bobSeat = await takeSeat(instance, duelId, bob);

  expect(await adaTab.next()).toEqual({ type: "friendState", playerId: bob.id, state: "inDuel" });
  const opponentSeat = await takeSeat(instance, duelId, opponent);
  await playToEnd(bobSeat, opponentSeat);
  expect(await adaTab.next()).toEqual({ type: "friendState", playerId: bob.id, state: "online" });
  for (const socket of [adaTab, bobTab, bobSeat, opponentSeat]) socket.close();
});

test("a Friend opening the socket while seated in a Duel is told In a Duel to the Player", async () => {
  const instance = startInstance(await createRedis());
  const [ada, bob] = [await signIn(instance), await signIn(instance)];
  await befriend(instance, ada, bob);
  const bobSeat = await takeSeat(instance, await createCustomDuel(instance, bob), bob);
  const bobTab = await openToldTab(instance, bob);

  const adaTab = await openToldTab(instance, ada);

  expect(adaTab.told.friends).toEqual([{ playerId: bob.id, state: "inDuel" }]);
  for (const socket of [adaTab, bobTab, bobSeat]) socket.close();
});

test("a Friend whose Custom Duel expires unplayed is pushed as Online again when the sweep forgets it", async () => {
  const instance = startInstance(await createRedis(), { duel: { expiryMs: 300 } });
  const [ada, bob] = [await signIn(instance), await signIn(instance)];
  await befriend(instance, ada, bob);
  const bobTab = await openToldTab(instance, bob);
  const adaTab = await openToldTab(instance, ada);
  const bobSeat = await takeSeat(instance, await createCustomDuel(instance, bob), bob);
  expect(await adaTab.next()).toEqual({ type: "friendState", playerId: bob.id, state: "inDuel" });

  expect(await adaTab.next()).toEqual({ type: "friendState", playerId: bob.id, state: "online" });
  for (const socket of [adaTab, bobTab, bobSeat]) socket.close();
});

test("a Friend paired into a ranked Duel is pushed as In a Duel, and as Online once it has ended", async () => {
  const instance = startInstance(await createRedis(), { duel: quickDuels });
  const [ada, bob, opponent] = [
    await signIn(instance),
    await signIn(instance),
    await signIn(instance),
  ];
  await befriend(instance, ada, bob);
  const bobTab = await openToldTab(instance, bob);
  const adaTab = await openToldTab(instance, ada);
  const queued = [];
  for (const { cookie } of [bob, opponent]) {
    const socket = await openSocketOf<QueueServerMessage, QueueClientMessage>(
      `${instance.origin.replace(/^http/, "ws")}/api/queue/socket`,
      cookie,
    );
    await socket.next();
    queued.push(socket);
  }
  await tickMatchmaker(instance.redis, Date.now());
  for (const socket of queued) {
    const proposal = await socket.next();
    if (proposal.type !== "proposed") throw new Error(`Expected proposed, got ${proposal.type}`);
    socket.send({ type: "accept", pairingId: proposal.pairingId });
  }
  const paired = await queued[0]?.next();
  if (paired?.type !== "paired") throw new Error(`Expected paired, got ${paired?.type}`);

  expect(await adaTab.next()).toEqual({ type: "friendState", playerId: bob.id, state: "inDuel" });
  const bobSeat = await takeSeat(instance, paired.duelId, bob);
  const opponentSeat = await takeSeat(instance, paired.duelId, opponent);
  await playToEnd(bobSeat, opponentSeat);
  expect(await adaTab.next()).toEqual({ type: "friendState", playerId: bob.id, state: "online" });
  for (const socket of [adaTab, bobTab, bobSeat, opponentSeat, ...queued]) socket.close();
});

test("a Friend request sent is pushed to every tab of the receiver and of the sender, on any instance", async () => {
  const redis = await createRedis();
  const [one, other] = [startInstance(redis), startInstance(redis)];
  const [ada, bob] = [await signIn(one), await signIn(one)];
  const adaTabs = [await openToldTab(one, ada), await openToldTab(other, ada)];
  const bobTabs = [await openToldTab(one, bob), await openToldTab(other, bob)];

  await sendRequest(one, ada, bob);

  for (const tab of bobTabs)
    expect(await tab.next()).toEqual({ type: "friendRequestReceived", playerId: ada.id });
  for (const tab of adaTabs)
    expect(await tab.next()).toEqual({ type: "friendRequestSent", playerId: bob.id });
  for (const tab of [...adaTabs, ...bobTabs]) tab.close();
});

test("an accepted Friend request is pushed to both Players with each other's state, whose changes follow", async () => {
  const instance = startInstance(await createRedis(), { online: { windowMs: 150 } });
  const [ada, bob] = [await signIn(instance), await signIn(instance)];
  await sendRequest(instance, ada, bob);
  const adaTab = await openToldTab(instance, ada);
  const bobTab = await openToldTab(instance, bob);

  const accepted = await call(
    instance,
    "POST",
    `/api/friends/requests/${ada.id}/accept`,
    bob.cookie,
  );

  expect(accepted.status).toBe(204);
  expect(await adaTab.next()).toEqual({ type: "friendRequestAccepted", playerId: bob.id });
  expect(await adaTab.next()).toEqual({ type: "friendState", playerId: bob.id, state: "online" });
  expect(await bobTab.next()).toEqual({ type: "friendRequestAccepted", playerId: ada.id });
  expect(await bobTab.next()).toEqual({ type: "friendState", playerId: ada.id, state: "online" });
  bobTab.close();
  expect(await adaTab.next()).toEqual({ type: "friendState", playerId: bob.id, state: "offline" });
  adaTab.close();
});

test("a crossed Friend request makes both Players Friends, pushed to both", async () => {
  const instance = startInstance(await createRedis());
  const [ada, bob] = [await signIn(instance), await signIn(instance)];
  await sendRequest(instance, ada, bob);
  const adaTab = await openToldTab(instance, ada);
  const bobTab = await openToldTab(instance, bob);

  await sendRequest(instance, bob, ada);

  expect(await adaTab.next()).toEqual({ type: "friendRequestAccepted", playerId: bob.id });
  expect(await bobTab.next()).toEqual({ type: "friendRequestAccepted", playerId: ada.id });
  adaTab.close();
  bobTab.close();
});

test("a declined or cancelled Friend request is pushed as removed to both Players", async () => {
  const instance = startInstance(await createRedis());
  const [ada, bob, cid] = [await signIn(instance), await signIn(instance), await signIn(instance)];
  await sendRequest(instance, ada, bob);
  await sendRequest(instance, ada, cid);
  const [adaTab, bobTab, cidTab] = [
    await openToldTab(instance, ada),
    await openToldTab(instance, bob),
    await openToldTab(instance, cid),
  ];

  const declined = await call(
    instance,
    "POST",
    `/api/friends/requests/${ada.id}/decline`,
    bob.cookie,
  );
  const cancelled = await call(instance, "DELETE", `/api/friends/requests/${cid.id}`, ada.cookie);

  expect([declined.status, cancelled.status]).toEqual([204, 204]);
  expect(await bobTab.next()).toEqual({ type: "friendRequestRemoved", playerId: ada.id });
  expect(await cidTab.next()).toEqual({ type: "friendRequestRemoved", playerId: ada.id });
  expect([await adaTab.next(), await adaTab.next()]).toEqual([
    { type: "friendRequestRemoved", playerId: bob.id },
    { type: "friendRequestRemoved", playerId: cid.id },
  ]);
  for (const tab of [adaTab, bobTab, cidTab]) tab.close();
});

test("a removed Friend is pushed to both Players, whose states are no longer pushed to each other", async () => {
  const instance = startInstance(await createRedis());
  const [ada, bob] = [await signIn(instance), await signIn(instance)];
  await befriend(instance, ada, bob);
  const adaTab = await openToldTab(instance, ada);
  const bobTab = await openToldTab(instance, bob);
  await adaTab.next();

  const removed = await call(instance, "DELETE", `/api/friends/${ada.id}`, bob.cookie);

  expect(removed.status).toBe(204);
  expect(await adaTab.next()).toEqual({ type: "friendRemoved", playerId: bob.id });
  expect(await bobTab.next()).toEqual({ type: "friendRemoved", playerId: ada.id });
  const bobSecondTab = await openToldTab(instance, bob);
  const bobSeat = await takeSeat(instance, await createCustomDuel(instance, bob), bob);
  expect(await adaTab.staysSilent(200)).toBe(true);
  for (const socket of [adaTab, bobTab, bobSecondTab, bobSeat]) socket.close();
});
