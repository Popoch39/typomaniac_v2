import type { Redis } from "../../redis/client.ts";

/**
 * How long a Player stays Online after their last socket stopped being refreshed. The server refreshes
 * every open socket itself, so a background tab whose timers the browser slows to one a minute stays
 * Online: Bun's protocol pings, which the browser answers outside page timers, keep the socket open.
 */
export const ONLINE_WINDOW_MS = 60_000;

// One step, so that two instances refreshing at once never count a Player the other just dropped.
const REFRESH_ONLINE = `
local now = tonumber(ARGV[1])
for index = 3, #ARGV do redis.call('ZADD', KEYS[1], now, ARGV[index]) end
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', '(' .. (now - tonumber(ARGV[2])))
redis.call('PEXPIRE', KEYS[1], ARGV[2])
return redis.call('ZCARD', KEYS[1])
`;

/** Marks the Players Online at `now` and counts the Players refreshed within the window. */
export const refreshOnline = async (
  redis: Redis,
  playerIds: Iterable<string>,
  { now, windowMs }: { readonly now: number; readonly windowMs: number },
) => {
  const count: number = await redis.client.send("EVAL", [
    REFRESH_ONLINE,
    "1",
    redis.name("online"),
    String(now),
    String(windowMs),
    ...playerIds,
  ]);
  return count;
};
