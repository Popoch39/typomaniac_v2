import { afterAll, expect, test } from "bun:test";
import type { QueueClientMessage, QueueServerMessage } from "@repo/matchmaking-engine";
import { tickMatchmaker } from "../src/modules/queue/service.ts";
import { createTestAuth } from "./helpers/auth.ts";
import { createTestDb } from "./helpers/db.ts";
import { createCustomDuel, playToEnd, quickDuels, takeSeat } from "./helpers/duel.ts";
import {
  type Account,
  befriend,
  call,
  createInstances,
  type Instance,
  openPlayerSocket,
  sendFriendRequest,
} from "./helpers/instance.ts";
import { openSocketOf } from "./helpers/socket.ts";

const testDb = await createTestDb();
const auth = createTestAuth(testDb.db);
const { createRedis, startInstance, signIn, cleanup } = createInstances(testDb.db, auth);
afterAll(async () => {
  await cleanup();
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

// A tab of the Player, whose Online counts are skipped: they change with every Player of the test.
const openTab = async (instance: Instance, { cookie }: Account) => {
  const socket = await openPlayerSocket<PlayerServerMessage>(instance, cookie);
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

  await sendFriendRequest(one, ada, bob);

  for (const tab of bobTabs)
    expect(await tab.next()).toEqual({ type: "friendRequestReceived", playerId: ada.id });
  for (const tab of adaTabs)
    expect(await tab.next()).toEqual({ type: "friendRequestSent", playerId: bob.id });
  for (const tab of [...adaTabs, ...bobTabs]) tab.close();
});

test("an accepted Friend request is pushed to both Players with each other's state, whose changes follow", async () => {
  const instance = startInstance(await createRedis(), { online: { windowMs: 150 } });
  const [ada, bob] = [await signIn(instance), await signIn(instance)];
  await sendFriendRequest(instance, ada, bob);
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
  await sendFriendRequest(instance, ada, bob);
  const adaTab = await openToldTab(instance, ada);
  const bobTab = await openToldTab(instance, bob);

  await sendFriendRequest(instance, bob, ada);

  expect(await adaTab.next()).toEqual({ type: "friendRequestAccepted", playerId: bob.id });
  expect(await bobTab.next()).toEqual({ type: "friendRequestAccepted", playerId: ada.id });
  adaTab.close();
  bobTab.close();
});

test("a declined or cancelled Friend request is pushed as removed to both Players", async () => {
  const instance = startInstance(await createRedis());
  const [ada, bob, cid] = [await signIn(instance), await signIn(instance), await signIn(instance)];
  await sendFriendRequest(instance, ada, bob);
  await sendFriendRequest(instance, ada, cid);
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
