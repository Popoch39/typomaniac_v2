import type { Redis } from "../../redis/client.ts";

/** How long a Queue entry outlives the last refresh by the API instance holding its socket. */
export const QUEUE_ENTRY_EXPIRY_MS = 15_000;

const entryKey = (redis: Redis, playerId: string) => redis.name("queue", "entry", playerId);

// A Player already queued keeps their instant of entry: a socket that takes their place over takes
// their waiting time with it. Entering and naming the socket that holds the entry are one step.
const ENTER = `
redis.call('HSETNX', KEYS[1], 'queuedAt', ARGV[1])
redis.call('HSET', KEYS[1], 'mmr', ARGV[2], 'connection', ARGV[3])
redis.call('PEXPIRE', KEYS[1], ARGV[4])
return redis.call('HGET', KEYS[1], 'queuedAt')
`;

/** Queues the Player, held by `connection` from now on, and gives their instant of entry. */
export const enterQueue = async (
  redis: Redis,
  playerId: string,
  entry: { mmr: number; connection: string; now: number; expiryMs: number },
): Promise<number> => {
  const queuedAt: string = await redis.client.eval(
    ENTER,
    1,
    entryKey(redis, playerId),
    entry.now,
    entry.mmr,
    entry.connection,
    entry.expiryMs,
  );
  return Number(queuedAt);
};

// Only the socket that holds the entry may remove it: an evicted socket closing leaves it alone.
const LEAVE = `
if redis.call('HGET', KEYS[1], 'connection') ~= ARGV[1] then return 0 end
redis.call('DEL', KEYS[1])
return 1
`;

export const leaveQueue = async (redis: Redis, playerId: string, connection: string) => {
  await redis.client.eval(LEAVE, 1, entryKey(redis, playerId), connection);
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
