import type { Pair } from "@repo/matchmaking-engine";
import type { Redis } from "@repo/redis";
import {
  entryKey,
  entryKeyPrefix,
  pairingChannel,
  pairingKey,
  pendingPairingsKey,
  waitingKey,
} from "./keys.ts";

/** How long both Players of a Pairing have to accept it. */
export const PAIRING_ACCEPT_MS = 10_000;

/**
 * What travels on the Pairing channel, one message per Player concerned: each API instance keeps
 * those of the Players whose socket it holds. Instants are in server time.
 */
export type PairingChange =
  | {
      readonly type: "proposed";
      readonly playerId: string;
      readonly pairingId: string;
      /** The instant the time to accept ends. */
      readonly expiresAt: number;
    }
  /** The Player waits again, from the instant of entry they had. */
  | { readonly type: "requeued"; readonly playerId: string; readonly queuedAt: number }
  /** The Player did not accept in time and left the Queue. */
  | { readonly type: "removed"; readonly playerId: string }
  | { readonly type: "paired"; readonly playerId: string; readonly duelId: string };

// Does nothing unless both Players are still waiting: the pair comes from a snapshot, which either
// may have left since, and which another tick may have read too. Marking both entries is what keeps
// a Player to one Pairing at a time.
const PROPOSE = `
for player = 1, 2 do
  if redis.call('EXISTS', KEYS[player]) == 0 or redis.call('HEXISTS', KEYS[player], 'pairing') == 1 then
    return 0
  end
end
redis.call('HSET', KEYS[1], 'pairing', ARGV[1])
redis.call('HSET', KEYS[2], 'pairing', ARGV[1])
redis.call('HSET', KEYS[3], 'player0', ARGV[2], 'player1', ARGV[3], 'expiresAt', ARGV[4])
redis.call('ZADD', KEYS[4], ARGV[4], ARGV[1])
for player = 2, 3 do
  redis.call('PUBLISH', ARGV[5], cjson.encode({
    type = 'proposed', playerId = ARGV[player], pairingId = ARGV[1], expiresAt = tonumber(ARGV[4])
  }))
end
return 1
`;

/** Proposes the pair to each other until `expiresAt`, and tells whether it did. */
export const proposePairing = async (
  redis: Redis,
  [first, second]: Pair,
  expiresAt: number,
): Promise<boolean> => {
  const pairingId = crypto.randomUUID();
  const proposed: number = await redis.client.eval(
    PROPOSE,
    4,
    entryKey(redis, first),
    entryKey(redis, second),
    pairingKey(redis, pairingId),
    pendingPairingsKey(redis),
    pairingId,
    first,
    second,
    expiresAt,
    pairingChannel(redis),
  );
  return proposed === 1;
};

/** The two Players of a Pairing awaiting acceptance, `null` once it is accepted by both or resolved. */
export const readPairing = async (redis: Redis, pairingId: string) => {
  const [first, second] = await redis.client.hmget(
    pairingKey(redis, pairingId),
    "player0",
    "player1",
  );
  if (!first || !second) return null;
  return { playerIds: [first, second] as const };
};

/** A hash the second acceptance creates, with the fields it is created with. */
export type CreatedHash = {
  readonly key: string;
  readonly fields: Readonly<Record<string, string>>;
};

/** What the second acceptance creates in its own step: the ranked Duel, as the API describes it. */
export type DuelCreation = {
  readonly duelId: string;
  readonly hashes: readonly CreatedHash[];
  readonly expiryMs: number;
  /** The sorted set the API sweeps its Duels from, and the instant this one is first due at. */
  readonly due: { readonly key: string; readonly at: number };
};

// The second acceptance creates the Duel in the step that records it: a Pairing is never accepted
// by both without a Duel, and creating it needs no matchmaker. An acceptance counts only from a
// Player of the Pairing, in time, whose entry still names it: one who left the Queue since has not
// accepted. An entry is removed only while it names this Pairing, so a Player who left and came
// back keeps their new one.
const ACCEPT = `
local pairing = redis.call('HMGET', KEYS[1], 'player0', 'player1', 'expiresAt', 'accepted0', 'accepted1')
if not pairing[1] or tonumber(pairing[3]) < tonumber(ARGV[3]) then return 'gone' end
local seat
for player = 1, 2 do
  if pairing[player] == ARGV[2] then seat = player end
end
if not seat then return 'gone' end
if redis.call('HGET', ARGV[4] .. ARGV[2], 'pairing') ~= ARGV[1] then return 'gone' end
redis.call('HSET', KEYS[1], 'accepted' .. (seat - 1), '1')
if not pairing[6 - seat] then return 'waiting' end
for hash = 5, #KEYS do
  redis.call('HSET', KEYS[hash], unpack(cjson.decode(ARGV[hash + 4])))
  redis.call('PEXPIRE', KEYS[hash], ARGV[7])
end
redis.call('ZADD', KEYS[4], ARGV[8], ARGV[6])
for player = 1, 2 do
  local entry = ARGV[4] .. pairing[player]
  if redis.call('HGET', entry, 'pairing') == ARGV[1] then
    redis.call('DEL', entry)
    redis.call('ZREM', KEYS[3], pairing[player])
  end
  redis.call('PUBLISH', ARGV[5], cjson.encode({
    type = 'paired', playerId = pairing[player], duelId = ARGV[6]
  }))
end
redis.call('DEL', KEYS[1])
redis.call('ZREM', KEYS[2], ARGV[1])
return 'paired'
`;

/**
 * Records that the Player accepts the Pairing at `now`. `waiting`: the other Player has not yet.
 * `paired`: this was the second acceptance, and the Duel of `creation` now exists. `gone`: the
 * Pairing is not theirs to accept, or no longer.
 */
export const acceptPairing = async (
  redis: Redis,
  pairingId: string,
  playerId: string,
  { now, creation }: { now: number; creation: DuelCreation },
): Promise<"waiting" | "paired" | "gone"> => {
  const accepted: string = await redis.client.eval(
    ACCEPT,
    4 + creation.hashes.length,
    pairingKey(redis, pairingId),
    pendingPairingsKey(redis),
    waitingKey(redis),
    creation.due.key,
    ...creation.hashes.map(({ key }) => key),
    pairingId,
    playerId,
    now,
    entryKeyPrefix(redis),
    pairingChannel(redis),
    creation.duelId,
    creation.expiryMs,
    creation.due.at,
    ...creation.hashes.map(({ fields }) => JSON.stringify(Object.entries(fields).flat())),
  );
  if (accepted === "waiting" || accepted === "paired" || accepted === "gone") return accepted;
  throw new Error(`Unexpected Pairing acceptance answer: ${accepted}`);
};

// Ends a Pairing whose time to accept has passed. The Player who accepted waits again: their entry
// kept its instant of entry all along, so it only stops naming the Pairing. The other leaves the
// Queue. An entry that no longer names this Pairing is left alone: its Player left, and may have
// come back since. Run twice, or after the second acceptance, it finds nothing to end.
const RESOLVE = `
local pairing = redis.call('HMGET', KEYS[1], 'player0', 'player1', 'accepted0', 'accepted1')
redis.call('DEL', KEYS[1])
redis.call('ZREM', KEYS[2], ARGV[1])
if not pairing[1] then return end
for player = 1, 2 do
  local playerId = pairing[player]
  local entry = ARGV[2] .. playerId
  if redis.call('HGET', entry, 'pairing') == ARGV[1] then
    if pairing[player + 2] then
      redis.call('HDEL', entry, 'pairing')
      redis.call('PUBLISH', ARGV[3], cjson.encode({
        type = 'requeued', playerId = playerId, queuedAt = tonumber(redis.call('HGET', entry, 'queuedAt'))
      }))
    else
      redis.call('DEL', entry)
      redis.call('ZREM', KEYS[3], playerId)
      redis.call('PUBLISH', ARGV[3], cjson.encode({ type = 'removed', playerId = playerId }))
    end
  end
end
`;

/** Resolves every Pairing whose time to accept ended at `now` or before. */
export const resolveExpiredPairings = async (redis: Redis, now: number) => {
  const expired: string[] = await redis.client.send("ZRANGEBYSCORE", [
    pendingPairingsKey(redis),
    "-inf",
    String(now),
  ]);
  for (const pairingId of expired)
    await redis.client.eval(
      RESOLVE,
      3,
      pairingKey(redis, pairingId),
      pendingPairingsKey(redis),
      waitingKey(redis),
      pairingId,
      entryKeyPrefix(redis),
      pairingChannel(redis),
    );
};
