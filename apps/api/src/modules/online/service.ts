import type { UnwrapSchema } from "elysia";
import type { Redis } from "../../redis/client.ts";
import { isInUnfinishedDuel } from "../duel/service.ts";
import type * as OnlineModel from "./model.ts";

export type PlayerServerMessage = UnwrapSchema<(typeof OnlineModel.Socket.Response)[200]>;

export type FriendState = Extract<PlayerServerMessage, { type: "friendState" }>["state"];

/**
 * How long a Player stays Online after their last socket stopped being refreshed. The server refreshes
 * every open socket itself, so a background tab whose timers the browser slows to one a minute stays
 * Online: Bun's protocol pings, which the browser answers outside page timers, keep the socket open.
 */
export const ONLINE_WINDOW_MS = 60_000;

// One step, so that two instances refreshing at once never count a Player the other just dropped,
// and that each Player who comes Online or leaves is found by exactly one of them.
const REFRESH_ONLINE = `
local now = tonumber(ARGV[1])
local since = now - tonumber(ARGV[2])
local joined = {}
for index = 3, #ARGV do
  local score = redis.call('ZSCORE', KEYS[1], ARGV[index])
  if not score or tonumber(score) < since then table.insert(joined, ARGV[index]) end
  redis.call('ZADD', KEYS[1], now, ARGV[index])
end
local left = redis.call('ZRANGEBYSCORE', KEYS[1], '-inf', '(' .. since)
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', '(' .. since)
redis.call('PEXPIRE', KEYS[1], ARGV[2])
return { redis.call('ZCARD', KEYS[1]), joined, left }
`;

/**
 * Marks the Players Online at `now` and counts the Players refreshed within the window. Also gives
 * the Players this refresh brought Online and those it found gone past the window.
 */
export const refreshOnline = async (
  redis: Redis,
  playerIds: Iterable<string>,
  { now, windowMs }: { readonly now: number; readonly windowMs: number },
) => {
  const [count, joined, left]: [number, string[], string[]] = await redis.client.send("EVAL", [
    REFRESH_ONLINE,
    "1",
    redis.name("online"),
    String(now),
    String(windowMs),
    ...playerIds,
  ]);
  return { count, changed: [...joined, ...left] };
};

/** The window as it stands now, for refreshing or reading who is Online. */
export const onlineWindowNow = (windowMs: number) => ({ now: Date.now(), windowMs });

/**
 * The state each Player shows their Friends at `now`: Online while refreshed within the window, and
 * In a Duel while also seated in an unfinished Duel.
 */
export const readPlayerStates = async (
  redis: Redis,
  playerIds: readonly string[],
  { now, windowMs }: { readonly now: number; readonly windowMs: number },
) => {
  const states = new Map<string, FriendState>();
  if (playerIds.length === 0) return states;
  const scores: (string | null)[] = await redis.client.send("ZMSCORE", [
    redis.name("online"),
    ...playerIds,
  ]);
  await Promise.all(
    playerIds.map(async (playerId, index) => {
      const score = scores[index];
      const isOnline = score !== null && score !== undefined && Number(score) >= now - windowMs;
      if (!isOnline) states.set(playerId, "offline");
      else states.set(playerId, (await isInUnfinishedDuel(redis, playerId)) ? "inDuel" : "online");
    }),
  );
  // In the order asked, whichever lookup answered first.
  return new Map(playerIds.map((playerId) => [playerId, states.get(playerId) ?? "offline"]));
};

/** The channel every Player socket of the Player follows, on whichever instance holds it. */
export const playerChannel = (redis: Redis, playerId: string) =>
  redis.name("online", "player", playerId);

/** What travels on a Player's channel: the message, and the one socket it is not for, if any. */
export type PlayerPush = { readonly message: PlayerServerMessage; readonly except: string | null };

/**
 * Sends the message to every open Player socket of the Player, on any instance, but the socket
 * `except` names: one already told otherwise.
 */
export const pushToPlayer = async (
  redis: Redis,
  playerId: string,
  message: PlayerServerMessage,
  except: string | null = null,
) => {
  const push: PlayerPush = { message, except };
  await redis.client.publish(playerChannel(redis, playerId), JSON.stringify(push));
};

/** How long a challenged Player has to answer. */
export const CHALLENGE_EXPIRY_MS = 60_000;

/** A waiting Challenge, kept in Redis only. */
export type Challenge = {
  readonly challengeId: string;
  readonly challengerId: string;
  readonly targetId: string;
  /** The socket that challenged, the only tab of the challenger taken into the Duel. */
  readonly connection: string;
  readonly expiresAt: number;
};

const challengeKey = (redis: Redis, challengeId: string) => redis.name("challenge", challengeId);
/** The one Challenge a Player has waiting, by id. */
const sentChallengeKey = (redis: Redis, playerId: string) =>
  redis.name("player", playerId, "challenge");
/** The Challenges waiting for a Player's answer, by id. */
const receivedChallengesKey = (redis: Redis, playerId: string) =>
  redis.name("player", playerId, "challenges");
/** Every waiting Challenge, scored by the instant it expires, for the sweep. */
const dueChallengesKey = (redis: Redis) => redis.name("challenges", "due");

// One step, so that a Player never has two Challenges waiting. The keys outlive the expiry by as
// much again, so that the sweep finds an expired Challenge whatever its delay.
const OPEN_CHALLENGE = `
if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
local ttl = tonumber(ARGV[6])
redis.call('SET', KEYS[1], ARGV[1], 'PX', ttl)
redis.call('HSET', KEYS[2], 'challengerId', ARGV[2], 'targetId', ARGV[3], 'connection', ARGV[4], 'expiresAt', ARGV[5])
redis.call('PEXPIRE', KEYS[2], ttl)
redis.call('SADD', KEYS[3], ARGV[1])
redis.call('PEXPIRE', KEYS[3], ttl)
redis.call('ZADD', KEYS[4], ARGV[5], ARGV[1])
return 1
`;

/**
 * Records the Challenge, waiting `expiryMs` from `now`; "pending" when the challenger already has one
 * waiting.
 */
export const openChallenge = async (
  redis: Redis,
  {
    challengerId,
    targetId,
    connection,
    now,
    expiryMs,
  }: {
    readonly challengerId: string;
    readonly targetId: string;
    readonly connection: string;
    readonly now: number;
    readonly expiryMs: number;
  },
): Promise<Challenge | "pending"> => {
  const challenge: Challenge = {
    challengeId: crypto.randomUUID(),
    challengerId,
    targetId,
    connection,
    expiresAt: now + expiryMs,
  };
  const opened = await redis.client.eval(
    OPEN_CHALLENGE,
    4,
    sentChallengeKey(redis, challengerId),
    challengeKey(redis, challenge.challengeId),
    receivedChallengesKey(redis, targetId),
    dueChallengesKey(redis),
    challenge.challengeId,
    challengerId,
    targetId,
    connection,
    challenge.expiresAt,
    expiryMs * 2,
  );
  return opened === 1 ? challenge : "pending";
};

/** The Challenge while it waits, `null` once answered, withdrawn or swept. */
export const readChallenge = async (
  redis: Redis,
  challengeId: string,
): Promise<Challenge | null> => {
  const [challengerId, targetId, connection, expiresAt]: (string | null)[] =
    await redis.client.send("HMGET", [
      challengeKey(redis, challengeId),
      "challengerId",
      "targetId",
      "connection",
      "expiresAt",
    ]);
  if (challengerId == null || targetId == null || connection == null || expiresAt == null)
    return null;
  return { challengeId, challengerId, targetId, connection, expiresAt: Number(expiresAt) };
};

// One step, so that of all who close a Challenge at once, from any tab or instance, exactly one does.
// Each condition holds unless its argument is empty.
const CLOSE_CHALLENGE = `
local fields = redis.call('HMGET', KEYS[1], 'targetId', 'connection', 'expiresAt')
if not fields[1] then return 0 end
if ARGV[2] ~= '' and fields[1] ~= ARGV[2] then return 0 end
if ARGV[3] ~= '' and fields[2] ~= ARGV[3] then return 0 end
if ARGV[4] ~= '' and tonumber(fields[3]) < tonumber(ARGV[4]) then return 0 end
redis.call('DEL', KEYS[1])
if redis.call('GET', KEYS[2]) == ARGV[1] then redis.call('DEL', KEYS[2]) end
redis.call('SREM', KEYS[3], ARGV[1])
redis.call('ZREM', KEYS[4], ARGV[1])
return 1
`;

/**
 * Ends the Challenge, whether this closes it: `false` when it was already closed, or when it is not
 * for `targetId`, was not sent from `connection`, or has expired by `answeredAt`, each when given.
 */
export const closeChallenge = async (
  redis: Redis,
  challenge: Challenge,
  {
    targetId = "",
    connection = "",
    answeredAt,
  }: {
    readonly targetId?: string;
    readonly connection?: string;
    readonly answeredAt?: number;
  } = {},
) =>
  (await redis.client.eval(
    CLOSE_CHALLENGE,
    4,
    challengeKey(redis, challenge.challengeId),
    sentChallengeKey(redis, challenge.challengerId),
    receivedChallengesKey(redis, challenge.targetId),
    dueChallengesKey(redis),
    challenge.challengeId,
    targetId,
    connection,
    answeredAt === undefined ? "" : String(answeredAt),
  )) === 1;

/** The Player's waiting Challenges, the one they sent and those they received. */
export const readChallengesOf = async (redis: Redis, playerId: string) => {
  const [sent, received] = await Promise.all([
    redis.client.get(sentChallengeKey(redis, playerId)),
    redis.client.smembers(receivedChallengesKey(redis, playerId)),
  ]);
  const challengeIds = sent === null ? received : [sent, ...received];
  const challenges = await Promise.all(challengeIds.map((id) => readChallenge(redis, id)));
  return challenges.filter((challenge) => challenge !== null);
};

/** The ids of the Challenges that expired by `now`, still waiting for the sweep. */
export const readDueChallenges = async (redis: Redis, now: number): Promise<string[]> =>
  redis.client.send("ZRANGEBYSCORE", [dueChallengesKey(redis), "-inf", String(now)]);

/** Forgets a due Challenge already closed otherwise. */
export const forgetDueChallenge = async (redis: Redis, challengeId: string) => {
  await redis.client.send("ZREM", [dueChallengesKey(redis), challengeId]);
};

/** Cancels the Challenges, telling every tab of both Players of each one this closed. */
export const cancelChallenges = async (redis: Redis, challenges: readonly Challenge[]) => {
  await Promise.all(
    challenges.map(async (challenge) => {
      if (!(await closeChallenge(redis, challenge))) return;
      const message = { type: "challengeCancelled", challengeId: challenge.challengeId } as const;
      await Promise.all([
        pushToPlayer(redis, challenge.challengerId, message),
        pushToPlayer(redis, challenge.targetId, message),
      ]);
    }),
  );
};

/** Cancels any Challenge waiting between the two Players, whichever challenged. */
export const cancelChallengesBetween = async (redis: Redis, playerId: string, otherId: string) => {
  const challenges = await readChallengesOf(redis, playerId);
  await cancelChallenges(
    redis,
    challenges.filter(
      ({ challengerId, targetId }) => challengerId === otherId || targetId === otherId,
    ),
  );
};
