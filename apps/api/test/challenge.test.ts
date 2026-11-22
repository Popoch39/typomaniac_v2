import { afterAll, expect, test } from "bun:test";
import type { ClientMessage, ServerMessage } from "@repo/duel-engine";
import { getLogger } from "@repo/logger";
import { createApp, type AppOptions } from "../src/app.ts";
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
  const { player, cookie, nickname } = await signInPlayerWithNickname(auth, instance.origin);
  return { id: player.id, cookie, nickname };
};
type Account = Awaited<ReturnType<typeof signIn>>;

const befriend = async (instance: Instance, one: Account, other: Account) => {
  const sent = await call(instance, "POST", "/api/friends/requests", one.cookie, {
    playerId: other.id,
  });
  expect(sent.status).toBe(200);
  const accepted = await call(
    instance,
    "POST",
    `/api/friends/requests/${one.id}/accept`,
    other.cookie,
  );
  expect(accepted.status).toBe(204);
};

// A tab of the Player, which only hears of Challenges: the Online count and the Friends' states
// change with every Player of the test.
const openTab = async (instance: Instance, { cookie }: Account) => {
  const socket = await openSocketOf<PlayerServerMessage, PlayerClientMessage>(
    `${instance.origin.replace(/^http/, "ws")}/api/online/socket`,
    cookie,
  );
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

const quickDuels = { countdownMs: 0, roundPauseMs: 0 };

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
