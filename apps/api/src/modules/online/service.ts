import type { Redis } from "../../redis/client.ts";

/**
 * How long a ping keeps a Player Online. Several of the app's 30 s pings, since a browser slows the
 * timers of a background tab to one a minute and a Player in such a tab still has Typomaniac open.
 */
export const ONLINE_WINDOW_MS = 120_000;

// One step, so that two instances pinging at once never count a Player the other just dropped.
const PING_ONLINE = `
redis.call('ZADD', KEYS[1], ARGV[1], ARGV[2])
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', '(' .. (tonumber(ARGV[1]) - tonumber(ARGV[3])))
redis.call('PEXPIRE', KEYS[1], ARGV[3])
return redis.call('ZCARD', KEYS[1])
`;

/** Marks the Player Online at `now` and counts the Players who pinged within the window. */
export const pingOnline = async (
  redis: Redis,
  playerId: string,
  { now, windowMs }: { now: number; windowMs: number },
) => {
  const count: number = await redis.client.send("EVAL", [
    PING_ONLINE,
    "1",
    redis.name("online"),
    String(now),
    playerId,
    String(windowMs),
  ]);
  return { count };
};
