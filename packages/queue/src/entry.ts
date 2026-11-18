import type { QueuedPlayer } from "@repo/matchmaking-engine";
import type { Redis } from "@repo/redis";
import { entryKey, entryKeyPrefix, waitingKey } from "./keys.ts";

/** How long a Queue entry outlives the last refresh by the API instance holding its socket. */
export const QUEUE_ENTRY_EXPIRY_MS = 15_000;

// A Player already queued keeps their instant of entry: a socket that takes their place over takes
// their waiting time with it. Entering and naming the socket that holds the entry are one step.
const ENTER = `
redis.call('HSETNX', KEYS[1], 'queuedAt', ARGV[1])
redis.call('HSET', KEYS[1], 'mmr', ARGV[2], 'connection', ARGV[3])
redis.call('PEXPIRE', KEYS[1], ARGV[4])
local queuedAt = redis.call('HGET', KEYS[1], 'queuedAt')
redis.call('ZADD', KEYS[2], queuedAt, ARGV[5])
return queuedAt
`;

/** Queues the Player, held by `connection` from now on, and gives their instant of entry. */
export const enterQueue = async (
  redis: Redis,
  playerId: string,
  entry: { mmr: number; connection: string; now: number; expiryMs: number },
): Promise<number> => {
  const queuedAt: string = await redis.client.eval(
    ENTER,
    2,
    entryKey(redis, playerId),
    waitingKey(redis),
    entry.now,
    entry.mmr,
    entry.connection,
    entry.expiryMs,
    playerId,
  );
  return Number(queuedAt);
};

// Only the socket that holds the entry may remove it: an evicted socket closing leaves it alone.
const LEAVE = `
if redis.call('HGET', KEYS[1], 'connection') ~= ARGV[1] then return 0 end
redis.call('DEL', KEYS[1])
redis.call('ZREM', KEYS[2], ARGV[2])
return 1
`;

export const leaveQueue = async (redis: Redis, playerId: string, connection: string) => {
  await redis.client.eval(
    LEAVE,
    2,
    entryKey(redis, playerId),
    waitingKey(redis),
    connection,
    playerId,
  );
};

const REFRESH = `
if redis.call('HGET', KEYS[1], 'connection') ~= ARGV[1] then return 0 end
redis.call('PEXPIRE', KEYS[1], ARGV[2])
return 1
`;

/** Pushes the expiry of the entry back, and tells whether `connection` still holds it. */
export const refreshQueueEntry = async (
  redis: Redis,
  playerId: string,
  connection: string,
  expiryMs: number,
): Promise<boolean> => {
  const held: number = await redis.client.eval(
    REFRESH,
    1,
    entryKey(redis, playerId),
    connection,
    expiryMs,
  );
  return held === 1;
};

/** The Player's entry in the Queue, `null` when they are not queued. */
export const readQueueEntry = async (redis: Redis, playerId: string) => {
  const { mmr, queuedAt } = await redis.client.hgetall(entryKey(redis, playerId));
  if (mmr === undefined || queuedAt === undefined) return null;
  return { mmr: Number(mmr), queuedAt: Number(queuedAt) };
};

// One step, so the snapshot is the Queue at a single instant. An entry that expired is forgotten
// here, and a Player with a Pairing awaiting acceptance is not waiting to be paired.
const WAITING = `
local waiting = {}
for _, playerId in ipairs(redis.call('ZRANGE', KEYS[1], 0, -1)) do
  local entry = redis.call('HMGET', ARGV[1] .. playerId, 'mmr', 'queuedAt', 'pairing')
  if not entry[1] then
    redis.call('ZREM', KEYS[1], playerId)
  elseif not entry[3] then
    waiting[#waiting + 1] = playerId
    waiting[#waiting + 1] = entry[1]
    waiting[#waiting + 1] = entry[2]
  end
end
return waiting
`;

/** A snapshot of the Queue: the Players waiting to be paired, as the matchmaking engine takes them. */
export const readWaitingPlayers = async (redis: Redis): Promise<QueuedPlayer[]> => {
  const flat: string[] = await redis.client.eval(
    WAITING,
    1,
    waitingKey(redis),
    entryKeyPrefix(redis),
  );
  const waiting: QueuedPlayer[] = [];
  for (let index = 0; index + 2 < flat.length; index += 3) {
    const [playerId, mmr, queuedAt] = flat.slice(index, index + 3);
    if (playerId !== undefined)
      waiting.push({ playerId, mmr: Number(mmr), queuedAt: Number(queuedAt) });
  }
  return waiting;
};
