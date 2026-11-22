import { afterAll, expect, test } from "bun:test";
import type { QueueClientMessage, QueueServerMessage } from "@repo/matchmaking-engine";
import { proposePairing } from "../src/modules/queue/service.ts";
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
} from "./helpers/instance.ts";
import { openSocketOf } from "./helpers/socket.ts";

const testDb = await createTestDb();
const auth = createTestAuth(testDb.db);
const { createRedis, startInstance, signIn, cleanup } = createInstances(testDb.db, auth);
afterAll(async () => {
  await cleanup();
  await testDb.drop();
});

type ChallengeMessage =
  | { type: "challengeSent"; challengeId: string; playerId: string; answerWithinMs: number }
  | { type: "challengeRefused"; playerId: string; code: string }
  | {
      type: "challengeReceived";
      challengeId: string;
      challenger: {
        id: string;
        nickname: string;
        avatarUrl: string | null;
        rank: unknown;
        ornament: unknown;
      };
      answerWithinMs: number;
    }
  | { type: "challengeAccepted"; challengeId: string; duelId: string }
  | { type: "challengeDeclined"; challengeId: string; playerId: string }
  | { type: "challengeAnsweredElsewhere"; challengeId: string }
  | { type: "challengeCancelled"; challengeId: string }
  | { type: "challengeExpired"; challengeId: string };
type PlayerServerMessage = { type: string } | ChallengeMessage;
type PlayerClientMessage =
  | { type: "challenge"; playerId: string }
  | { type: "cancelChallenge"; challengeId: string }
  | { type: "acceptChallenge"; challengeId: string }
  | { type: "declineChallenge"; challengeId: string };
type ChallengeType = ChallengeMessage["type"];

// A tab of the Player, which only hears of Challenges: the Online count and the Friends' states
// change with every Player of the test.
const openTab = async (instance: Instance, { cookie }: Account) => {
  const socket = await openPlayerSocket<PlayerServerMessage, PlayerClientMessage>(instance, cookie);
  const next = async (): Promise<ChallengeMessage> => {
    for (;;) {
      const message = await socket.next();
      if (message.type.startsWith("challenge")) return message as ChallengeMessage;
    }
  };
  const nextOf = async <Type extends ChallengeType>(type: Type) => {
    const message = await next();
    if (message.type !== type) throw new Error(`Expected ${type}, got ${JSON.stringify(message)}`);
    return message as Extract<ChallengeMessage, { type: Type }>;
  };
  // Whether no Challenge message arrives for that long.
  const staysSilent = async (ms: number) => {
    const settled = await Promise.race([next(), Bun.sleep(ms).then(() => null)]);
    return settled === null;
  };
  return { ...socket, next, nextOf, staysSilent };
};
type Tab = Awaited<ReturnType<typeof openTab>>;

// The Challenge the challenger's tab sent, as the Friend's tab received it.
const challenge = async (from: Tab, to: Account, toTab: Tab) => {
  from.send({ type: "challenge", playerId: to.id });
  const sent = await from.nextOf("challengeSent");
  const received = await toTab.nextOf("challengeReceived");
  expect(received.challengeId).toBe(sent.challengeId);
  return sent.challengeId;
};

test("a Challenge to an Online Friend pops up in every tab of the Friend, with the challenger and the time left", async () => {
  const instance = startInstance(await createRedis());
  const [ada, bob] = [await signIn(instance), await signIn(instance)];
  await befriend(instance, ada, bob);
  const bobTabs = [await openTab(instance, bob), await openTab(instance, bob)];
  const adaTab = await openTab(instance, ada);

  adaTab.send({ type: "challenge", playerId: bob.id });

  const sent = await adaTab.nextOf("challengeSent");
  expect(sent).toEqual({
    type: "challengeSent",
    challengeId: expect.any(String),
    playerId: bob.id,
    answerWithinMs: 60_000,
  });
  for (const tab of bobTabs)
    expect(await tab.next()).toEqual({
      type: "challengeReceived",
      challengeId: sent.challengeId,
      challenger: {
        id: ada.id,
        nickname: ada.nickname,
        avatarUrl: null,
        rank: null,
        ornament: { tier: "unranked", division: null },
      },
      answerWithinMs: 60_000,
    });
  for (const tab of [adaTab, ...bobTabs]) tab.close();
});

test("an accepted Challenge gives both sides the same Custom Duel, which both join and play", async () => {
  const instance = startInstance(await createRedis(), { duel: quickDuels });
  const [ada, bob] = [await signIn(instance), await signIn(instance)];
  await befriend(instance, ada, bob);
  const bobTab = await openTab(instance, bob);
  const adaTab = await openTab(instance, ada);
  const challengeId = await challenge(adaTab, bob, bobTab);

  bobTab.send({ type: "acceptChallenge", challengeId });

  const accepted = await bobTab.nextOf("challengeAccepted");
  expect(await adaTab.next()).toEqual(accepted);
  expect(accepted).toEqual({ type: "challengeAccepted", challengeId, duelId: expect.any(String) });
  const adaSeat = await takeSeat(instance, accepted.duelId, ada);
  const bobSeat = await takeSeat(instance, accepted.duelId, bob);
  await playToEnd(adaSeat, bobSeat);
  for (const socket of [adaTab, bobTab, adaSeat, bobSeat]) socket.close();
});

test("a Challenge is refused to a Player who is not a Friend, to an offline Friend, and while another one waits", async () => {
  const instance = startInstance(await createRedis());
  const [ada, bob, cid, dan] = [
    await signIn(instance),
    await signIn(instance),
    await signIn(instance),
    await signIn(instance),
  ];
  await befriend(instance, ada, bob);
  await befriend(instance, ada, cid);
  const adaTab = await openTab(instance, ada);
  const [bobTab, danTab] = [await openTab(instance, bob), await openTab(instance, dan)];

  adaTab.send({ type: "challenge", playerId: dan.id });
  expect(await adaTab.next()).toEqual({
    type: "challengeRefused",
    playerId: dan.id,
    code: "NOT_FRIENDS",
  });
  adaTab.send({ type: "challenge", playerId: cid.id });
  expect(await adaTab.next()).toEqual({
    type: "challengeRefused",
    playerId: cid.id,
    code: "FRIEND_OFFLINE",
  });
  await challenge(adaTab, bob, bobTab);
  const cidTab = await openTab(instance, cid);
  adaTab.send({ type: "challenge", playerId: cid.id });
  expect(await adaTab.next()).toEqual({
    type: "challengeRefused",
    playerId: cid.id,
    code: "CHALLENGE_PENDING",
  });

  expect(await danTab.staysSilent(100)).toBe(true);
  expect(await cidTab.staysSilent(100)).toBe(true);
  for (const tab of [adaTab, bobTab, cidTab, danTab]) tab.close();
});

test("challenging too fast is refused as rate limited", async () => {
  const instance = startInstance(await createRedis(), {
    rateLimit: { limits: { challenge: { max: 1, windowSeconds: 60 } } },
  });
  const [ada, bob] = [await signIn(instance), await signIn(instance)];
  await befriend(instance, ada, bob);
  const [adaTab, bobTab] = [await openTab(instance, ada), await openTab(instance, bob)];
  const challengeId = await challenge(adaTab, bob, bobTab);
  adaTab.send({ type: "cancelChallenge", challengeId });
  await adaTab.nextOf("challengeCancelled");

  adaTab.send({ type: "challenge", playerId: bob.id });

  expect(await adaTab.next()).toEqual({
    type: "challengeRefused",
    playerId: bob.id,
    code: "RATE_LIMITED",
  });
  adaTab.close();
  bobTab.close();
});

test("a declined Challenge is pushed to the challenger, and as answered to the Friend's other tabs", async () => {
  const instance = startInstance(await createRedis());
  const [ada, bob] = [await signIn(instance), await signIn(instance)];
  await befriend(instance, ada, bob);
  const adaTab = await openTab(instance, ada);
  const bobTabs = [await openTab(instance, bob), await openTab(instance, bob)];
  const challengeId = await challenge(adaTab, bob, bobTabs[0]!);
  await bobTabs[1]!.nextOf("challengeReceived");

  bobTabs[0]!.send({ type: "declineChallenge", challengeId });

  expect(await adaTab.next()).toEqual({ type: "challengeDeclined", challengeId, playerId: bob.id });
  expect(await bobTabs[1]!.next()).toEqual({ type: "challengeAnsweredElsewhere", challengeId });
  expect(await bobTabs[0]!.staysSilent(100)).toBe(true);
  for (const tab of [adaTab, ...bobTabs]) tab.close();
});

test("a Challenge nobody answers in time expires, pushed to both Players", async () => {
  const instance = startInstance(await createRedis(), { online: { challengeExpiryMs: 300 } });
  const [ada, bob] = [await signIn(instance), await signIn(instance)];
  await befriend(instance, ada, bob);
  const [adaTab, bobTab] = [await openTab(instance, ada), await openTab(instance, bob)];
  adaTab.send({ type: "challenge", playerId: bob.id });
  const { challengeId, answerWithinMs } = await adaTab.nextOf("challengeSent");
  await bobTab.nextOf("challengeReceived");

  expect(answerWithinMs).toBe(300);
  expect(await adaTab.next()).toEqual({ type: "challengeExpired", challengeId });
  expect(await bobTab.next()).toEqual({ type: "challengeExpired", challengeId });
  bobTab.send({ type: "acceptChallenge", challengeId });
  expect(await bobTab.next()).toEqual({ type: "challengeAnsweredElsewhere", challengeId });
  expect(await adaTab.staysSilent(100)).toBe(true);
  adaTab.close();
  bobTab.close();
});

test("of two tabs answering at once, on two instances, exactly one wins and the other is told it was answered", async () => {
  const redis = await createRedis();
  const [one, other] = [startInstance(redis), startInstance(redis)];
  const [ada, bob] = [await signIn(one), await signIn(one)];
  await befriend(one, ada, bob);
  const adaTab = await openTab(one, ada);
  const bobTabs = [await openTab(one, bob), await openTab(other, bob)];
  const challengeId = await challenge(adaTab, bob, bobTabs[0]!);
  await bobTabs[1]!.nextOf("challengeReceived");

  bobTabs[0]!.send({ type: "acceptChallenge", challengeId });
  bobTabs[1]!.send({ type: "acceptChallenge", challengeId });

  const answers = await Promise.all(bobTabs.map((tab) => tab.next()));
  expect(answers.map(({ type }) => type).sort()).toEqual([
    "challengeAccepted",
    "challengeAnsweredElsewhere",
  ]);
  expect(await adaTab.next()).toEqual(answers.find(({ type }) => type === "challengeAccepted")!);
  const winner = bobTabs[answers.findIndex(({ type }) => type === "challengeAccepted")]!;
  expect(await winner.staysSilent(100)).toBe(true);
  for (const tab of [adaTab, ...bobTabs]) tab.close();
});

test("a Challenge the challenger cancels is pushed as cancelled to the Friend, who can no longer accept it", async () => {
  const instance = startInstance(await createRedis());
  const [ada, bob] = [await signIn(instance), await signIn(instance)];
  await befriend(instance, ada, bob);
  const [adaTab, bobTab] = [await openTab(instance, ada), await openTab(instance, bob)];
  const challengeId = await challenge(adaTab, bob, bobTab);

  adaTab.send({ type: "cancelChallenge", challengeId });

  expect(await bobTab.next()).toEqual({ type: "challengeCancelled", challengeId });
  expect(await adaTab.next()).toEqual({ type: "challengeCancelled", challengeId });
  bobTab.send({ type: "acceptChallenge", challengeId });
  expect(await bobTab.next()).toEqual({ type: "challengeAnsweredElsewhere", challengeId });
  adaTab.send({ type: "challenge", playerId: bob.id });
  expect((await adaTab.next()).type).toBe("challengeSent");
  adaTab.close();
  bobTab.close();
});

test("a Challenge is cancelled when the tab that sent it closes", async () => {
  const instance = startInstance(await createRedis());
  const [ada, bob] = [await signIn(instance), await signIn(instance)];
  await befriend(instance, ada, bob);
  const adaTabs = [await openTab(instance, ada), await openTab(instance, ada)];
  const bobTab = await openTab(instance, bob);
  const challengeId = await challenge(adaTabs[0]!, bob, bobTab);

  adaTabs[0]!.close();

  expect(await bobTab.next()).toEqual({ type: "challengeCancelled", challengeId });
  expect(await adaTabs[1]!.next()).toEqual({ type: "challengeCancelled", challengeId });
  adaTabs[1]!.close();
  bobTab.close();
});

test("a Challenge is cancelled when the challenged Friend goes offline", async () => {
  const instance = startInstance(await createRedis(), { online: { windowMs: 150 } });
  const [ada, bob] = [await signIn(instance), await signIn(instance)];
  await befriend(instance, ada, bob);
  const [adaTab, bobTab] = [await openTab(instance, ada), await openTab(instance, bob)];
  const challengeId = await challenge(adaTab, bob, bobTab);

  bobTab.close();

  expect(await adaTab.next()).toEqual({ type: "challengeCancelled", challengeId });
  adaTab.close();
});

test("a Challenge is cancelled, on both sides, when either Player removes the other as a Friend", async () => {
  const instance = startInstance(await createRedis());
  const [ada, bob] = [await signIn(instance), await signIn(instance)];
  await befriend(instance, ada, bob);
  const [adaTab, bobTab] = [await openTab(instance, ada), await openTab(instance, bob)];
  const challengeId = await challenge(adaTab, bob, bobTab);

  const removed = await call(instance, "DELETE", `/api/friends/${ada.id}`, bob.cookie);

  expect(removed.status).toBe(204);
  expect(await adaTab.next()).toEqual({ type: "challengeCancelled", challengeId });
  expect(await bobTab.next()).toEqual({ type: "challengeCancelled", challengeId });
  adaTab.close();
  bobTab.close();
});

const enterQueue = async (instance: Instance, { cookie }: Account) => {
  const socket = await openSocketOf<QueueServerMessage, QueueClientMessage>(
    `${instance.origin.replace(/^http/, "ws")}/api/queue/socket`,
    cookie,
  );
  const queued = await socket.next();
  if (queued.type !== "queued") throw new Error(`Expected queued, got ${queued.type}`);
  return socket;
};
type QueueSocket = Awaited<ReturnType<typeof enterQueue>>;

const nextQueueMessageOf = async <Type extends QueueServerMessage["type"]>(
  socket: QueueSocket,
  type: Type,
) => {
  const message = await socket.next();
  if (message.type !== type) throw new Error(`Expected ${type}, got ${JSON.stringify(message)}`);
  return message as Extract<QueueServerMessage, { type: Type }>;
};

// The Pairing the matchmaker would propose to the two queued Players, awaiting their acceptance.
const pair = async (instance: Instance, sockets: readonly QueueSocket[], ids: [string, string]) => {
  expect(await proposePairing(instance.redis, ids, Date.now() + 10_000)).toBe(true);
  return Promise.all(sockets.map((socket) => nextQueueMessageOf(socket, "proposed")));
};

// Leaving follows the close of the Queue socket, which the server learns of a moment later.
const hasLeftQueue = async (instance: Instance, { cookie }: Account) => {
  for (let attempt = 0; attempt < 100; attempt++) {
    const response = await call(instance, "GET", "/api/queue", cookie);
    if (((await response.json()) as { queuedAt: number | null }).queuedAt === null) return true;
    await Bun.sleep(10);
  }
  return false;
};

test("a Challenge to a Friend seated in a Custom Duel is refused as busy", async () => {
  const instance = startInstance(await createRedis());
  const [ada, bob] = [await signIn(instance), await signIn(instance)];
  await befriend(instance, ada, bob);
  const [adaTab, bobTab] = [await openTab(instance, ada), await openTab(instance, bob)];
  const bobSeat = await takeSeat(instance, await createCustomDuel(instance, bob), bob);

  adaTab.send({ type: "challenge", playerId: bob.id });

  expect(await adaTab.next()).toEqual({
    type: "challengeRefused",
    playerId: bob.id,
    code: "FRIEND_BUSY",
  });
  expect(await bobTab.staysSilent(100)).toBe(true);
  for (const socket of [adaTab, bobTab, bobSeat]) socket.close();
});

test("a Challenge to a Friend seated in a ranked Duel is refused as busy", async () => {
  const instance = startInstance(await createRedis());
  const [ada, bob, cid] = [await signIn(instance), await signIn(instance), await signIn(instance)];
  await befriend(instance, ada, bob);
  const [adaTab, bobTab] = [await openTab(instance, ada), await openTab(instance, bob)];
  const queued = [await enterQueue(instance, bob), await enterQueue(instance, cid)];
  const proposals = await pair(instance, queued, [bob.id, cid.id]);
  for (const [index, socket] of queued.entries())
    socket.send({ type: "accept", pairingId: proposals[index]!.pairingId });
  await Promise.all(queued.map((socket) => nextQueueMessageOf(socket, "paired")));

  adaTab.send({ type: "challenge", playerId: bob.id });

  expect(await adaTab.next()).toEqual({
    type: "challengeRefused",
    playerId: bob.id,
    code: "FRIEND_BUSY",
  });
  expect(await bobTab.staysSilent(100)).toBe(true);
  for (const socket of [adaTab, bobTab, ...queued]) socket.close();
});

test("a Challenge to a Friend whose Pairing awaits acceptance is refused as busy", async () => {
  const instance = startInstance(await createRedis());
  const [ada, bob, cid] = [await signIn(instance), await signIn(instance), await signIn(instance)];
  await befriend(instance, ada, bob);
  const [adaTab, bobTab] = [await openTab(instance, ada), await openTab(instance, bob)];
  const queued = [await enterQueue(instance, bob), await enterQueue(instance, cid)];
  await pair(instance, queued, [bob.id, cid.id]);

  adaTab.send({ type: "challenge", playerId: bob.id });

  expect(await adaTab.next()).toEqual({
    type: "challengeRefused",
    playerId: bob.id,
    code: "FRIEND_BUSY",
  });
  expect(await bobTab.staysSilent(100)).toBe(true);
  for (const socket of [adaTab, bobTab, ...queued]) socket.close();
});

test("a Player seated in a Duel cannot challenge", async () => {
  const instance = startInstance(await createRedis());
  const [ada, bob] = [await signIn(instance), await signIn(instance)];
  await befriend(instance, ada, bob);
  const [adaTab, bobTab] = [await openTab(instance, ada), await openTab(instance, bob)];
  const adaSeat = await takeSeat(instance, await createCustomDuel(instance, ada), ada);

  adaTab.send({ type: "challenge", playerId: bob.id });

  expect(await adaTab.next()).toEqual({
    type: "challengeRefused",
    playerId: bob.id,
    code: "IN_DUEL",
  });
  expect(await bobTab.staysSilent(100)).toBe(true);
  for (const socket of [adaTab, bobTab, adaSeat]) socket.close();
});

test("a Friend in the Queue receives the Challenge, and accepting it takes them out of the Queue", async () => {
  const instance = startInstance(await createRedis());
  const [ada, bob] = [await signIn(instance), await signIn(instance)];
  await befriend(instance, ada, bob);
  const [adaTab, bobTab] = [await openTab(instance, ada), await openTab(instance, bob)];
  const bobQueue = await enterQueue(instance, bob);
  const challengeId = await challenge(adaTab, bob, bobTab);

  bobTab.send({ type: "acceptChallenge", challengeId });

  const accepted = await bobTab.nextOf("challengeAccepted");
  expect(await adaTab.next()).toEqual(accepted);
  expect(await bobQueue.next()).toEqual({ type: "removed", reason: "challenged" });
  await bobQueue.closed;
  expect(await hasLeftQueue(instance, bob)).toBe(true);
  adaTab.close();
  bobTab.close();
});

test("a waiting Challenge is cancelled, on both sides, when the challenged Friend is paired", async () => {
  const instance = startInstance(await createRedis());
  const [ada, bob, cid] = [await signIn(instance), await signIn(instance), await signIn(instance)];
  await befriend(instance, ada, bob);
  const [adaTab, bobTab] = [await openTab(instance, ada), await openTab(instance, bob)];
  const queued = [await enterQueue(instance, bob), await enterQueue(instance, cid)];
  const challengeId = await challenge(adaTab, bob, bobTab);

  await pair(instance, queued, [bob.id, cid.id]);

  expect(await adaTab.next()).toEqual({ type: "challengeCancelled", challengeId });
  expect(await bobTab.next()).toEqual({ type: "challengeCancelled", challengeId });
  bobTab.send({ type: "acceptChallenge", challengeId });
  expect(await bobTab.next()).toEqual({ type: "challengeAnsweredElsewhere", challengeId });
  for (const socket of [adaTab, bobTab, ...queued]) socket.close();
});

test("a waiting Challenge is cancelled, on both sides, when the challenged Friend is seated in a Duel", async () => {
  const instance = startInstance(await createRedis());
  const [ada, bob] = [await signIn(instance), await signIn(instance)];
  await befriend(instance, ada, bob);
  const [adaTab, bobTab] = [await openTab(instance, ada), await openTab(instance, bob)];
  const challengeId = await challenge(adaTab, bob, bobTab);

  const bobSeat = await takeSeat(instance, await createCustomDuel(instance, bob), bob);

  expect(await adaTab.next()).toEqual({ type: "challengeCancelled", challengeId });
  expect(await bobTab.next()).toEqual({ type: "challengeCancelled", challengeId });
  for (const socket of [adaTab, bobTab, bobSeat]) socket.close();
});
