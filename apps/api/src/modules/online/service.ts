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

/** Sends the message to every open Player socket of the Player, on any instance. */
export const pushToPlayer = async (
  redis: Redis,
  playerId: string,
  message: PlayerServerMessage,
) => {
  await redis.client.publish(playerChannel(redis, playerId), JSON.stringify(message));
};
