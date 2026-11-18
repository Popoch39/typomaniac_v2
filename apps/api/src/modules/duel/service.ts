import {
  type ClientMessage,
  DUEL_GAME_CONFIG,
  DUEL_WORD_COUNT,
  drawWords,
  getOutcome,
  type Participant,
  type Seat,
  type ServerMessage,
  START_WINDOW_MS,
} from "@repo/duel-engine";
import {
  applyEvent,
  createGame,
  type Game,
  type GameEvent,
  type GameStatus,
  getResult,
} from "@repo/typing-engine";
import type { Db } from "../../db/client.ts";
import { duel, duelGame } from "../../db/schema.ts";
import type { Redis } from "../../redis/client.ts";

/** How long a Duel can be joined after its creation. */
export const DUEL_EXPIRY_MS = 10 * 60 * 1000;

/** Who sits on a seat: a Player shown by their Nickname, or a Guest by their generated display name. */
export type Identity = {
  readonly id: string;
  readonly name: string;
  /** `null` for a Guest. */
  readonly playerId: string | null;
};

export type Duel = {
  readonly words: readonly string[];
  readonly participants: readonly Participant[];
  /** The id of the identity holding each seat, never sent to a client. */
  readonly holderIds: readonly (string | undefined)[];
  /** The Player holding each seat, `null` for a Guest or an empty seat. */
  readonly playerIds: readonly (string | null)[];
  /** The announced Start instant in server time, `null` until the Countdown is announced. */
  readonly startAt: number | null;
  /** What both Participants were told at the end, `null` until the Duel is finalised. */
  readonly end: DuelEnd | null;
};

export type DuelEnd = Extract<ServerMessage, { type: "end" }>;

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
// that holds a seat gets it back rather than the other one, even while it still looks connected
// there: its old socket may sit on a crashed instance, or be half-open, and never be closed.
const CLAIM = `
if redis.call('EXISTS', KEYS[1]) == 0 then return 'unknown' end
for seat = 0, 1 do
  if redis.call('HGET', KEYS[1], 'holder' .. seat) == ARGV[1] then
    redis.call('HSET', KEYS[1], 'connected' .. seat, '1')
    return tostring(seat)
  end
end
for seat = 0, 1 do
  if redis.call('HEXISTS', KEYS[1], 'holder' .. seat) == 0 then
    redis.call('HSET', KEYS[1], 'holder' .. seat, ARGV[1], 'name' .. seat, ARGV[2], 'connected' .. seat, '1')
    if ARGV[3] ~= '' then redis.call('HSET', KEYS[1], 'player' .. seat, ARGV[3]) end
    return tostring(seat)
  end
end
return 'full'
`;

export const claimSeat = async (
  redis: Redis,
  duelId: string,
  identity: Identity,
): Promise<Seat | "unknown" | "full"> => {
  const claimed: string = await redis.client.eval(
    CLAIM,
    1,
    duelKey(redis, duelId),
    identity.id,
    identity.name,
    identity.playerId ?? "",
  );
  if (claimed === "0") return 0;
  if (claimed === "1") return 1;
  if (claimed === "unknown" || claimed === "full") return claimed;
  throw new Error(`Unexpected seat claim answer: ${claimed}`);
};

// Does not recreate a Duel that expired meanwhile.
const HOLD = `
if redis.call('EXISTS', KEYS[1]) == 1 then
  redis.call('HSET', KEYS[1], 'connection' .. ARGV[1], ARGV[2], 'connected' .. ARGV[1], '1')
end
`;

/**
 * Makes `connection` the one socket that acts for `seat`: a socket that held it before, on
 * whichever instance, no longer does.
 */
export const holdSeat = async (redis: Redis, duelId: string, seat: Seat, connection: string) => {
  await redis.client.eval(HOLD, 1, duelKey(redis, duelId), seat, connection);
};

// Only the socket that holds the seat lets it go: one replaced by a reconnection closes later.
const RELEASE = `
if redis.call('HGET', KEYS[1], 'connection' .. ARGV[1]) ~= ARGV[2] then return 0 end
redis.call('HSET', KEYS[1], 'connected' .. ARGV[1], '0')
return 1
`;

/**
 * The seat stays held by its identity: only its connection is let go. Gives whether `connection`
 * was still the one holding the seat.
 */
export const releaseSeat = async (redis: Redis, duelId: string, seat: Seat, connection: string) => {
  const released: number = await redis.client.eval(
    RELEASE,
    1,
    duelKey(redis, duelId),
    seat,
    connection,
  );
  return released === 1;
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
  const playerIds = SEATS.map((seat) => fields[`player${seat}`] ?? null);
  const startAt = fields.startAt === undefined ? null : Number(fields.startAt);
  const end = fields.end === undefined ? null : (JSON.parse(fields.end) as DuelEnd);
  return {
    words: JSON.parse(fields.words) as string[],
    participants,
    holderIds,
    playerIds,
    startAt,
    end,
  };
};

// Atomic, so two instances seating the two Participants at once announce a single Start. Once
// announced, the Start never moves: a Participant who comes back gets the same instant.
const ANNOUNCE_START = `
if redis.call('EXISTS', KEYS[1]) == 0 then return {} end
local startAt = redis.call('HGET', KEYS[1], 'startAt')
if startAt then return {startAt, '0'} end
if redis.call('HGET', KEYS[1], 'connected0') ~= '1' or redis.call('HGET', KEYS[1], 'connected1') ~= '1' then return {} end
redis.call('HSET', KEYS[1], 'startAt', ARGV[1])
-- Counted again from the Start, so that a Duel joined late does not expire before it is finalised.
redis.call('PEXPIRE', KEYS[1], ARGV[2])
return {ARGV[1], '1'}
`;

/**
 * Announces the Start at `startAt` once both seats are connected. Gives the Start instant, and
 * whether this call announced it, or `null` while a seat is still empty or away.
 */
export const announceStart = async (
  redis: Redis,
  duelId: string,
  { startAt, expiryMs }: { readonly startAt: number; readonly expiryMs: number },
): Promise<{ startAt: number; announced: boolean } | null> => {
  const answer: string[] = await redis.client.eval(
    ANNOUNCE_START,
    1,
    duelKey(redis, duelId),
    startAt,
    expiryMs,
  );
  const [announcedAt, announced] = answer;
  if (announcedAt === undefined) return null;
  return { startAt: Number(announcedAt), announced: announced === "1" };
};

/**
 * Whether the server takes an Event of a Participant's Game. Nothing counts before the Start, and
 * the `start` itself only near the announced instant, so that neither Participant gets a head start.
 * Nothing counts after the end either: a finished Game cannot be added to.
 * No client adds words: both Games are played on the words drawn with the Duel.
 */
export const isEventAccepted = (
  event: Extract<ClientMessage, { type: "event" }>["event"],
  game: { readonly status: GameStatus; readonly startAt: number | null; readonly now: number },
) => {
  if (event.type === "addWords" || game.status === "finished") return false;
  if (event.type !== "start") return game.status === "running";
  if (game.status !== "ready" || game.startAt === null) return false;
  return Math.abs(game.now - game.startAt) <= START_WINDOW_MS;
};

const journalKey = (redis: Redis, duelId: string, seat: Seat) =>
  redis.name("duel", duelId, "journal", String(seat));

// One script, so a journal never lives on without its expiry, and nothing is appended to a Game
// that has ended, whichever instance ended it.
const APPEND = `
if redis.call('HGET', KEYS[1], 'ended' .. ARGV[1]) == '1' then return 0 end
for index = 4, #ARGV do redis.call('RPUSH', KEYS[2], ARGV[index]) end
redis.call('PEXPIRE', KEYS[2], ARGV[2])
if ARGV[3] == '1' and redis.call('EXISTS', KEYS[1]) == 1 then redis.call('HSET', KEYS[1], 'ended' .. ARGV[1], '1') end
return 1
`;

/**
 * Appends accepted Events to the journal of the Game played on `seat`, and marks the Game ended
 * when they end it. Gives whether they were appended: never once the Game has ended.
 */
export const appendEvents = async (
  redis: Redis,
  duelId: string,
  seat: Seat,
  events: readonly GameEvent[],
  { ends, expiryMs }: { readonly ends: boolean; readonly expiryMs: number },
) => {
  const appended: number = await redis.client.eval(
    APPEND,
    2,
    duelKey(redis, duelId),
    journalKey(redis, duelId, seat),
    seat,
    expiryMs,
    ends ? "1" : "0",
    ...events.map((event) => JSON.stringify(event)),
  );
  return appended === 1;
};

/**
 * Starts at the announced Start the Game of a Participant who comes back past the start window
 * without having started it: their own start would be refused, and their clock ran on meanwhile.
 * Gives the Events appended, `null` when the Game needs none.
 */
export const startLateGame = async (
  redis: Redis,
  duelId: string,
  seat: Seat,
  game: {
    readonly journal: readonly GameEvent[];
    readonly startAt: number | null;
    readonly now: number;
    readonly expiryMs: number;
  },
): Promise<GameEvent[] | null> => {
  const { journal, startAt, now, expiryMs } = game;
  if (journal.length > 0 || startAt === null || now - startAt <= START_WINDOW_MS) return null;
  const events: GameEvent[] = [{ type: "start", at: startAt }];
  const appended = await appendEvents(redis, duelId, seat, events, { ends: false, expiryMs });
  return appended ? events : null;
};

/** The Game played on journal `events`, as the server rebuilds it. */
export const replayGame = (words: readonly string[], events: readonly GameEvent[]): Game =>
  events.reduce(applyEvent, createGame(DUEL_GAME_CONFIG, words));

/**
 * The Events that end a Game still open after its deadline: its final Tick, 30 seconds after its
 * start. A Game that never started is started at the announced Start, so the time away counts.
 */
export const closingEvents = (game: Game, startAt: number): GameEvent[] => {
  const durationMs = DUEL_GAME_CONFIG.seconds * 1000;
  if (game.startedAt === null)
    return [
      { type: "start", at: startAt },
      { type: "tick", at: startAt + durationMs },
    ];
  return [{ type: "tick", at: game.startedAt + durationMs }];
};

/** How long a claim to finalise a Duel lasts, should its instance stop before releasing it. */
const FINALISATION_CLAIM_MS = 10_000;

const finalisationKey = (redis: Redis, duelId: string) =>
  redis.name("duel", duelId, "finalisation");

// Atomic, so that of every instance that sees both Games ended, a single one finalises the Duel at
// a time, and none once its end is recorded. The claim expires, so that a crash cannot hold it.
const CLAIM_FINALISATION = `
if redis.call('HGET', KEYS[1], 'ended0') ~= '1' or redis.call('HGET', KEYS[1], 'ended1') ~= '1' then return 0 end
if redis.call('HEXISTS', KEYS[1], 'end') == 1 then return 0 end
if redis.call('SET', KEYS[2], '1', 'NX', 'PX', ARGV[1]) then return 1 end
return 0
`;

// Does not recreate a Duel that expired meanwhile.
const RECORD_END = `
if redis.call('EXISTS', KEYS[1]) == 1 then redis.call('HSET', KEYS[1], 'end', ARGV[1]) end
`;

/** Keeps the end of a finalised Duel, for a Participant who comes back after it. */
export const recordEnd = async (redis: Redis, duelId: string, end: DuelEnd) => {
  await redis.client.eval(RECORD_END, 1, duelKey(redis, duelId), JSON.stringify(end));
};

/** Whether this call claimed the finalisation of a Duel whose Games have both ended. */
export const claimFinalisation = async (redis: Redis, duelId: string) => {
  const claimed: number = await redis.client.eval(
    CLAIM_FINALISATION,
    2,
    duelKey(redis, duelId),
    finalisationKey(redis, duelId),
    FINALISATION_CLAIM_MS,
  );
  return claimed === 1;
};

/** Lets a finalisation that failed be tried again, by this instance or another one. */
export const releaseFinalisation = async (redis: Redis, duelId: string) => {
  await redis.client.del(finalisationKey(redis, duelId));
};

/**
 * Judges a Duel whose two Games are finished from their journals, and saves it with both Games in
 * one transaction. Gives both Results and both Outcomes, indexed by seat. A Duel saved already, by
 * a finalisation that failed after its save, is not saved again.
 */
export const saveDuel = async (
  db: Db,
  duelId: string,
  played: {
    readonly words: readonly string[];
    readonly playerIds: readonly (string | null)[];
    readonly startAt: number;
    readonly journals: readonly [GameEvent[], GameEvent[]];
  },
) => {
  const { words, playerIds, startAt, journals } = played;
  const results = [
    getResult(replayGame(words, journals[0])),
    getResult(replayGame(words, journals[1])),
  ] as const;
  const outcomes = [
    getOutcome(results[0], results[1]),
    getOutcome(results[1], results[0]),
  ] as const;
  await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(duel)
      .values({
        id: duelId,
        config: DUEL_GAME_CONFIG,
        words: [...words],
        startedAt: new Date(startAt),
        endedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning({ id: duel.id });
    if (inserted.length === 0) return;
    await tx.insert(duelGame).values(
      SEATS.map((seat) => ({
        duelId,
        seat,
        playerId: playerIds[seat] ?? null,
        result: results[seat],
        journal: journals[seat],
        outcome: outcomes[seat],
      })),
    );
  });
  return { results, outcomes };
};

/** The journals of both Games so far, indexed by seat. */
export const readJournals = async (
  redis: Redis,
  duelId: string,
): Promise<[GameEvent[], GameEvent[]]> => {
  const read = async (seat: Seat) => {
    const events: string[] = await redis.client.lrange(journalKey(redis, duelId, seat), 0, -1);
    return events.map((event) => JSON.parse(event) as GameEvent);
  };
  return [await read(0), await read(1)];
};
