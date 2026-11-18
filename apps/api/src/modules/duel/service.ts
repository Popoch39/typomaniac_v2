import {
  type ClientMessage,
  DUEL_GAME_CONFIG,
  DUEL_WORD_COUNT,
  drawWords,
  END_GRACE_MS,
  finalTickAt,
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
import { duel, duelGame, duelParticipant, duelRound } from "../../db/schema.ts";
import type { Redis } from "../../redis/client.ts";
import type { Relay } from "./relay.ts";

/** How long a Duel can be joined after its creation. */
export const DUEL_EXPIRY_MS = 10 * 60 * 1000;

/** Who sits on a seat: a Player shown by their Nickname, or a Guest by their generated display name. */
export type Identity = {
  readonly id: string;
  readonly name: string;
  /** `null` for a Guest. */
  readonly playerId: string | null;
};

export type DuelKind = "custom" | "ranked";

/** What a Duel holds per Round: what both Games of the Round are played on. */
export type Round = {
  /** Rounds are numbered from 1. */
  readonly number: number;
  readonly words: readonly string[];
  /** The announced Start instant in server time, `null` until the Countdown is announced. */
  readonly startAt: number | null;
  /** The server instant the `start` of each seat's Game is anchored at, `null` until it starts. */
  readonly anchorAts: readonly (number | null)[];
};

export type Duel = {
  readonly kind: DuelKind;
  readonly participants: readonly Participant[];
  /** The id of the identity holding each seat, never sent to a client. */
  readonly holderIds: readonly (string | undefined)[];
  /** The Player holding each seat, `null` for a Guest or an empty seat. */
  readonly playerIds: readonly (string | null)[];
  /** The current Round. */
  readonly round: Round;
  /** What both Participants were told at the end, `null` until the Duel is finalised. */
  readonly end: DuelEnd | null;
};

export type DuelEnd = Extract<ServerMessage, { type: "end" }>;

const SEATS: readonly Seat[] = [0, 1];

const duelKey = (redis: Redis, duelId: string) => redis.name("duel", duelId);

const roundKey = (redis: Redis, duelId: string, round: number) =>
  redis.name("duel", duelId, "round", String(round));

// One script, so the expiry is set with the Duel and its first Round: neither can outlive it.
const CREATE = `
redis.call('HSET', KEYS[1], 'kind', ARGV[1], 'round', '1')
redis.call('HSET', KEYS[2], 'words', ARGV[2])
redis.call('PEXPIRE', KEYS[1], ARGV[3])
redis.call('PEXPIRE', KEYS[2], ARGV[3])
`;

export const createDuel = async (redis: Redis, kind: DuelKind, expiryMs: number) => {
  const duelId = crypto.randomUUID();
  // Drawn once: both seats read the same words, and none is added during the Round.
  const words = drawWords(DUEL_WORD_COUNT, Math.random);
  await redis.client.eval(
    CREATE,
    2,
    duelKey(redis, duelId),
    roundKey(redis, duelId, 1),
    kind,
    JSON.stringify(words),
    expiryMs,
  );
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
  if (fields.round === undefined) return null;
  const number = Number(fields.round);
  const round = await redis.client.hgetall(roundKey(redis, duelId, number));
  // Only when the Duel expired between the two reads.
  if (round.words === undefined) return null;
  const participants = SEATS.flatMap((seat): Participant[] => {
    const name = fields[`name${seat}`];
    if (name === undefined) return [];
    return [{ seat, name, connected: fields[`connected${seat}`] === "1" }];
  });
  const holderIds = SEATS.map((seat) => fields[`holder${seat}`]);
  const playerIds = SEATS.map((seat) => fields[`player${seat}`] ?? null);
  const startAt = round.startAt === undefined ? null : Number(round.startAt);
  const anchorAts = SEATS.map((seat) => {
    const anchorAt = round[`anchor${seat}`];
    return anchorAt === undefined ? null : Number(anchorAt);
  });
  const end = fields.end === undefined ? null : (JSON.parse(fields.end) as DuelEnd);
  return {
    kind: fields.kind === "ranked" ? "ranked" : "custom",
    participants,
    holderIds,
    playerIds,
    round: { number, words: JSON.parse(round.words) as string[], startAt, anchorAts },
    end,
  };
};

// Atomic, so two instances seating the two Participants at once announce a single Start. Once
// announced, the Start never moves: a Participant who comes back gets the same instant. Nothing is
// announced for a Round that is not the Duel's current one, nor for a Duel that expired.
const ANNOUNCE_START = `
if redis.call('HGET', KEYS[1], 'round') ~= ARGV[3] then return {} end
local startAt = redis.call('HGET', KEYS[2], 'startAt')
if startAt then return {startAt, '0'} end
if redis.call('HGET', KEYS[1], 'connected0') ~= '1' or redis.call('HGET', KEYS[1], 'connected1') ~= '1' then return {} end
redis.call('HSET', KEYS[2], 'startAt', ARGV[1])
-- Counted again from the Start, so that a Duel joined late does not expire before it is finalised.
redis.call('PEXPIRE', KEYS[1], ARGV[2])
redis.call('PEXPIRE', KEYS[2], ARGV[2])
return {ARGV[1], '1'}
`;

/**
 * Announces the Start of `round` at `startAt` once both seats are connected. Gives the Start
 * instant, and whether this call announced it, or `null` while a seat is still empty or away.
 */
export const announceStart = async (
  redis: Redis,
  duelId: string,
  round: number,
  { startAt, expiryMs }: { readonly startAt: number; readonly expiryMs: number },
): Promise<{ startAt: number; announced: boolean } | null> => {
  const answer: string[] = await redis.client.eval(
    ANNOUNCE_START,
    2,
    duelKey(redis, duelId),
    roundKey(redis, duelId, round),
    startAt,
    expiryMs,
    round,
  );
  const [announcedAt, announced] = answer;
  if (announcedAt === undefined) return null;
  return { startAt: Number(announcedAt), announced: announced === "1" };
};

/**
 * Whether the server takes an Event of a Participant's Game. Nothing counts before the Start, and
 * the `start` itself only near the announced instant, so that neither Participant gets a head start.
 * Nothing counts after the end either: a finished Game cannot be added to.
 * No client adds words: both Games are played on the words drawn with the Round.
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

const journalKey = (redis: Redis, duelId: string, round: number, seat: Seat) =>
  redis.name("duel", duelId, "round", String(round), "journal", String(seat));

// One script, so a journal never lives on without its expiry, and nothing is appended to a Game
// that has ended, whichever instance ended it, nor to a Game of a Round that is not the Duel's
// current one. The anchor is kept with the start it comes with, so that an instance never reads a
// started Game without it; the first one stands.
const APPEND = `
if redis.call('HGET', KEYS[1], 'round') ~= ARGV[5] then return 0 end
if redis.call('HGET', KEYS[2], 'ended' .. ARGV[1]) == '1' then return 0 end
for index = 6, #ARGV do redis.call('RPUSH', KEYS[3], ARGV[index]) end
redis.call('PEXPIRE', KEYS[3], ARGV[2])
if ARGV[3] == '1' then redis.call('HSET', KEYS[2], 'ended' .. ARGV[1], '1') end
if ARGV[4] ~= '' then redis.call('HSETNX', KEYS[2], 'anchor' .. ARGV[1], ARGV[4]) end
return 1
`;

/**
 * Appends accepted Events to the journal of the Game played on `seat` in `round`, and marks the
 * Game ended when they end it. `anchorAt` comes with the Events that start the Game: the server
 * instant its `start` is anchored at. Gives whether they were appended: never once the Game has
 * ended, nor when `round` is not the Duel's current Round.
 */
export const appendEvents = async (
  redis: Redis,
  duelId: string,
  round: number,
  seat: Seat,
  events: readonly GameEvent[],
  {
    ends,
    expiryMs,
    anchorAt,
  }: { readonly ends: boolean; readonly expiryMs: number; readonly anchorAt?: number | null },
) => {
  const appended: number = await redis.client.eval(
    APPEND,
    3,
    duelKey(redis, duelId),
    roundKey(redis, duelId, round),
    journalKey(redis, duelId, round, seat),
    seat,
    expiryMs,
    ends ? "1" : "0",
    anchorAt ?? "",
    round,
    ...events.map((event) => JSON.stringify(event)),
  );
  return appended === 1;
};

/**
 * Starts at the announced Start the Game of a Participant who comes back past the start window
 * without having started it: their own start would be refused, and their clock ran on meanwhile.
 * That Game is on the server's clock, anchored at the Start. Gives the Events appended, `null` when the Game needs none.
 */
export const startLateGame = async (
  redis: Redis,
  duelId: string,
  round: number,
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
  const appended = await appendEvents(redis, duelId, round, seat, events, {
    ends: false,
    expiryMs,
    anchorAt: startAt,
  });
  return appended ? events : null;
};

/** The Game played on journal `events`, as the server rebuilds it. */
export const replayGame = (words: readonly string[], events: readonly GameEvent[]): Game =>
  events.reduce(applyEvent, createGame(DUEL_GAME_CONFIG, words));

/**
 * The Events that end a Game still open after its deadline, from its `journal`: its final Tick, 30
 * seconds after its start and no earlier than its last Event. A Game that never started is started
 * at the announced Start, so the time away counts.
 */
export const closingEvents = (journal: readonly GameEvent[], startAt: number): GameEvent[] => {
  const [started] = journal;
  if (started?.type !== "start")
    return [
      { type: "start", at: startAt },
      { type: "tick", at: finalTickAt(startAt, journal) },
    ];
  return [{ type: "tick", at: finalTickAt(started.at, journal) }];
};

/** How long a claim to finalise a Duel lasts, should its instance stop before releasing it. */
const FINALISATION_CLAIM_MS = 10_000;

const finalisationKey = (redis: Redis, duelId: string) =>
  redis.name("duel", duelId, "finalisation");

// Atomic, so that of every instance that sees both Games of the current Round ended, a single one
// finalises the Duel at a time, and none once its end is recorded. The claim expires, so that a
// crash cannot hold it.
const CLAIM_FINALISATION = `
if redis.call('HGET', KEYS[1], 'round') ~= ARGV[2] then return 0 end
if redis.call('HGET', KEYS[3], 'ended0') ~= '1' or redis.call('HGET', KEYS[3], 'ended1') ~= '1' then return 0 end
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

/** Whether this call claimed the finalisation of a Duel whose Games of `round` have both ended. */
export const claimFinalisation = async (redis: Redis, duelId: string, round: number) => {
  const claimed: number = await redis.client.eval(
    CLAIM_FINALISATION,
    3,
    duelKey(redis, duelId),
    finalisationKey(redis, duelId),
    roundKey(redis, duelId, round),
    FINALISATION_CLAIM_MS,
    round,
  );
  return claimed === 1;
};

/** Lets a finalisation that failed be tried again, by this instance or another one. */
export const releaseFinalisation = async (redis: Redis, duelId: string) => {
  await redis.client.del(finalisationKey(redis, duelId));
};

/**
 * Judges a Duel whose single Round has both Games finished from their journals, and saves it with
 * its Round, both Games and both participants in one transaction. Gives both Results and both
 * Outcomes, indexed by seat. A Duel saved already, by a finalisation that failed after its save,
 * is not saved again.
 */
export const saveDuel = async (
  db: Db,
  duelId: string,
  played: {
    readonly kind: DuelKind;
    readonly playerIds: readonly (string | null)[];
    readonly round: number;
    readonly words: readonly string[];
    readonly startAt: number;
    readonly journals: readonly [GameEvent[], GameEvent[]];
  },
) => {
  const { kind, playerIds, round, words, startAt, journals } = played;
  const results = [
    getResult(replayGame(words, journals[0])),
    getResult(replayGame(words, journals[1])),
  ] as const;
  const outcomes = [
    getOutcome(results[0], results[1]),
    getOutcome(results[1], results[0]),
  ] as const;
  const startedAt = new Date(startAt);
  const endedAt = new Date();
  await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(duel)
      .values({ id: duelId, kind, config: DUEL_GAME_CONFIG, startedAt, endedAt })
      .onConflictDoNothing()
      .returning({ id: duel.id });
    if (inserted.length === 0) return;
    await tx.insert(duelRound).values({ duelId, round, words: [...words], startedAt, endedAt });
    await tx.insert(duelGame).values(
      SEATS.map((seat) => ({
        duelId,
        round,
        seat,
        result: results[seat],
        journal: journals[seat],
        outcome: outcomes[seat],
      })),
    );
    // With a single Round, the Outcome of the Duel is the Outcome of that Round.
    await tx.insert(duelParticipant).values(
      SEATS.map((seat) => ({
        duelId,
        seat,
        playerId: playerIds[seat] ?? null,
        outcome: outcomes[seat],
      })),
    );
  });
  return { results, outcomes };
};

/** The journals of both Games of `round` so far, indexed by seat. */
export const readJournals = async (
  redis: Redis,
  duelId: string,
  round: number,
): Promise<[GameEvent[], GameEvent[]]> => {
  const read = async (seat: Seat) => {
    const events: string[] = await redis.client.lrange(
      journalKey(redis, duelId, round, seat),
      0,
      -1,
    );
    return events.map((event) => JSON.parse(event) as GameEvent);
  };
  return [await read(0), await read(1)];
};

/**
 * Saves a Duel whose two Games of `round` have ended, keeps its end and announces it to both
 * Participants. Run by whichever instance sees both Games ended: the claim lets only one of them
 * through, and is let go when the finalisation fails, so that it can be tried again.
 */
export const finaliseDuel = async (
  db: Db,
  redis: Redis,
  relay: Pick<Relay, "publish">,
  duelId: string,
  round: number,
) => {
  if (!(await claimFinalisation(redis, duelId, round))) return;
  try {
    const duel = await readDuel(redis, duelId);
    // Expired meanwhile: nothing is left to save.
    if (!duel) return;
    const { number, words, startAt } = duel.round;
    if (startAt === null) throw new Error(`Duel ${duelId} has ended without a Start`);
    const { results, outcomes } = await saveDuel(db, duelId, {
      kind: duel.kind,
      playerIds: duel.playerIds,
      round: number,
      words,
      startAt,
      journals: await readJournals(redis, duelId, number),
    });
    const end = { type: "end", results, outcomes } as const;
    await recordEnd(redis, duelId, end);
    await relay.publish(duelId, null, end);
  } catch (error) {
    await releaseFinalisation(redis, duelId);
    throw error;
  }
};

/**
 * Ends the Games of the current Round whose clients went silent, at their start plus 30 seconds,
 * then finalises the Duel.
 */
export const closeOverdueGames = async (
  db: Db,
  redis: Redis,
  relay: Pick<Relay, "publish">,
  duelId: string,
  { startAt, expiryMs }: { readonly startAt: number; readonly expiryMs: number },
) => {
  const duel = await readDuel(redis, duelId);
  if (!duel) return;
  const { number, words } = duel.round;
  const journals = await readJournals(redis, duelId, number);
  for (const seat of SEATS) {
    const game = replayGame(words, journals[seat]);
    if (game.status === "finished") continue;
    const events = closingEvents(journals[seat], startAt);
    await appendEvents(redis, duelId, number, seat, events, { ends: true, expiryMs });
  }
  await finaliseDuel(db, redis, relay, duelId, number);
};

/**
 * Runs `close` on each Duel once its deadline has passed, then again until it succeeds: a failed
 * finalisation is tried again here, until the Duel is finalised or expires. Each instance that
 * holds one of a Duel's sockets watches its deadline, so that any of them can close it.
 */
export const createDeadlineWatch = (close: (duelId: string, startAt: number) => Promise<void>) => {
  const deadlines = new Map<string, ReturnType<typeof setTimeout>>();
  const watch = (
    duelId: string,
    startAt: number,
    delayMs = startAt + DUEL_GAME_CONFIG.seconds * 1000 + END_GRACE_MS - Date.now(),
  ) => {
    if (deadlines.has(duelId)) return;
    const timer = setTimeout(() => {
      close(duelId, startAt).then(
        () => deadlines.delete(duelId),
        (error: unknown) => {
          console.error(`Could not close the overdue Games of Duel ${duelId}`, error);
          deadlines.delete(duelId);
          watch(duelId, startAt, END_GRACE_MS);
        },
      );
    }, delayMs);
    deadlines.set(duelId, timer);
  };
  const stop = () => {
    for (const timer of deadlines.values()) clearTimeout(timer);
    deadlines.clear();
  };
  return { watch: (duelId: string, startAt: number) => watch(duelId, startAt), stop };
};
