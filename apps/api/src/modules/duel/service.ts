import { DUEL_WORD_COUNT, drawWords, type Participant, type Seat } from "@repo/duel-engine";
import type { Redis } from "../../redis/client.ts";

/** How long a Duel can be joined after its creation. */
export const DUEL_EXPIRY_MS = 10 * 60 * 1000;

/** Who sits on a seat: a Player is identified by their id and shown by their Nickname. */
export type Identity = { readonly id: string; readonly name: string };

export type Duel = {
  readonly words: readonly string[];
  readonly participants: readonly Participant[];
  /** The id of the identity holding each seat, never sent to a client. */
  readonly holderIds: readonly (string | undefined)[];
};

const SEATS: readonly Seat[] = [0, 1];

const duelKey = (redis: Redis, duelId: string) => redis.name("duel", duelId);

// One script, so the expiry is set with the Duel: a Duel can never outlive it.
const CREATE = `
redis.call('HSET', KEYS[1], 'words', ARGV[1])
redis.call('PEXPIRE', KEYS[1], ARGV[2])
`;

export const createDuel = async (redis: Redis, expiryMs: number) => {
  const duelId = crypto.randomUUID();
  // Drawn once: both seats read the same words, and none is added during the Duel.
  const words = drawWords(DUEL_WORD_COUNT, Math.random);
  await redis.client.eval(CREATE, 1, duelKey(redis, duelId), JSON.stringify(words), expiryMs);
  return duelId;
};

// Atomic, so two identities opening the same Duel at once never get the same seat. An identity
// that holds a seat gets it back rather than the other one, unless it is connected there already.
const CLAIM = `
if redis.call('EXISTS', KEYS[1]) == 0 then return 'unknown' end
for seat = 0, 1 do
  if redis.call('HGET', KEYS[1], 'holder' .. seat) == ARGV[1] then
    if redis.call('HGET', KEYS[1], 'connected' .. seat) == '1' then return 'seated' end
    redis.call('HSET', KEYS[1], 'connected' .. seat, '1')
    return tostring(seat)
  end
end
for seat = 0, 1 do
  if redis.call('HEXISTS', KEYS[1], 'holder' .. seat) == 0 then
    redis.call('HSET', KEYS[1], 'holder' .. seat, ARGV[1], 'name' .. seat, ARGV[2], 'connected' .. seat, '1')
    return tostring(seat)
  end
end
return 'full'
`;

export const claimSeat = async (
  redis: Redis,
  duelId: string,
  identity: Identity,
): Promise<Seat | "unknown" | "full" | "seated"> => {
  const claimed: string = await redis.client.eval(
    CLAIM,
    1,
    duelKey(redis, duelId),
    identity.id,
    identity.name,
  );
  if (claimed === "0") return 0;
  if (claimed === "1") return 1;
  if (claimed === "unknown" || claimed === "full" || claimed === "seated") return claimed;
  throw new Error(`Unexpected seat claim answer: ${claimed}`);
};

// Does not recreate a Duel that expired meanwhile.
const RELEASE = `
if redis.call('EXISTS', KEYS[1]) == 1 then redis.call('HSET', KEYS[1], 'connected' .. ARGV[1], '0') end
`;

/** The seat stays held by its identity: only its connection is let go. */
export const releaseSeat = async (redis: Redis, duelId: string, seat: Seat) => {
  await redis.client.eval(RELEASE, 1, duelKey(redis, duelId), seat);
};

export const readDuel = async (redis: Redis, duelId: string): Promise<Duel | null> => {
  const fields = await redis.client.hgetall(duelKey(redis, duelId));
  if (fields.words === undefined) return null;
  const participants = SEATS.flatMap((seat): Participant[] => {
    const name = fields[`name${seat}`];
    if (name === undefined) return [];
    return [{ seat, name, connected: fields[`connected${seat}`] === "1" }];
  });
  const holderIds = SEATS.map((seat) => fields[`holder${seat}`]);
  return { words: JSON.parse(fields.words) as string[], participants, holderIds };
};
