import {
  type ClientMessage,
  DUEL_GAME_CONFIG,
  DUEL_WORD_COUNT,
  drawWords,
  END_GRACE_MS,
  type FinishedRound,
  finalTickAt,
  getAverageMultiplier,
  getDuelOutcomes,
  getOutcome,
  type Outcome,
  type Participant,
  type RankedEnd,
  type Seat,
  type ServerMessage,
  START_WINDOW_MS,
} from "@repo/duel-engine";
import type { Logger } from "@repo/logger";
import type { Ornament, Rank } from "@repo/ranked-engine";
import {
  applyEvent,
  createGame,
  type Game,
  type GameEvent,
  type GameStatus,
  getResult,
} from "@repo/typing-engine";
import { eq } from "drizzle-orm";
import type { Db, Transaction } from "../../db/client.ts";
import { duel, duelGame, duelParticipant, duelRound } from "../../db/schema.ts";
import type { Redis } from "../../redis/client.ts";
import {
  moveStandings,
  rankFromStored,
  type StandingMove,
  storedRank,
  visibleStanding,
} from "../standing/service.ts";
import type { Relay } from "./relay.ts";

/** How long a Duel can be joined after its creation. */
export const DUEL_EXPIRY_MS = 10 * 60 * 1000;

/** Who sits on a seat: a Player shown by their Nickname, or a Guest by their generated display name. */
export type Identity = {
  readonly id: string;
  readonly name: string;
  /** `null` for a Guest. */
  readonly playerId: string | null;
  /** `null` for a Guest or a Player without a picture. */
  readonly avatarUrl: string | null;
  /** `null` for a Guest or a Player who wears none. */
  readonly ornament: Ornament;
};

export type DuelKind = "custom" | "ranked";

/**
 * A Player a seat of a ranked Duel is held for, shown by their Nickname, their Avatar, their Ornament
 * and their Rank.
 */
export type RankedSeat = {
  readonly playerId: string;
  readonly nickname: string;
  readonly avatarUrl: string | null;
  readonly ornament: Ornament;
  /** The Rank as the Duel is created, `null` while the Player is Unranked. */
  readonly rank: Rank | null;
};

/** What a Duel holds per Round: what both Games of the Round are played on. */
export type Round = {
  /** Rounds are numbered from 1. */
  readonly number: number;
  readonly words: readonly string[];
  /**
   * The Start instant in server time, `null` until it is fixed: with its Countdown for the first
   * Round, when the Round before it ends for a later one.
   */
  readonly startAt: number | null;
  /** Whether the Countdown was announced: only then do the Participants hold the Target words. */
  readonly announced: boolean;
  /** The server instant the `start` of each seat's Game is anchored at, `null` until it starts. */
  readonly anchorAts: readonly (number | null)[];
  /** Whether each seat's Game has ended. */
  readonly gamesEnded: readonly boolean[];
  /**
   * Both Results, both Multipliers and both Outcomes of the Round and the instant it ended, `null`
   * until then.
   */
  readonly end: (FinishedRound & { readonly endedAt: number }) | null;
};

export type Duel = {
  readonly kind: DuelKind;
  readonly participants: readonly Participant[];
  /** The id of the identity holding each seat, never sent to a client. */
  readonly holderIds: readonly (string | undefined)[];
  /** The Player holding each seat, `null` for a Guest or an empty seat. */
  readonly playerIds: readonly (string | null)[];
  /**
   * The Rank of each Player of a ranked Duel as it was created, indexed by seat, `null` for an
   * Unranked Player; `null` for a Custom Duel.
   */
  readonly ranks: readonly [Rank | null, Rank | null] | null;
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

/**
 * The Duels that are not finalised, each scored by the instant its next step is due at: what every
 * instance sweeps. The steps that move a Duel forward move its score with it, in their own script.
 */
const dueKey = (redis: Redis) => redis.name("duels", "due");

/**
 * The ranked Duel a Player is in, recorded against them from its creation until it is finalised:
 * what the Queue reads to refuse them. It expires with the Duel, should the Duel never be finalised.
 */
const rankedDuelKey = (redis: Redis, playerId: string) =>
  redis.name("player", playerId, "rankedDuel");

/** From the Start of a Round to the instant the server closes the Games still open. */
const CLOSE_AFTER_MS = DUEL_GAME_CONFIG.seconds * 1000 + END_GRACE_MS;

// One script, so the expiry is set with the Duel and its first Round: neither can outlive it. The
// Duel is due once it has expired, when the sweep forgets it.
const CREATE = `
redis.call('HSET', KEYS[1], 'kind', ARGV[1], 'round', '1')
redis.call('HSET', KEYS[2], 'words', ARGV[2])
redis.call('PEXPIRE', KEYS[1], ARGV[3])
redis.call('PEXPIRE', KEYS[2], ARGV[3])
redis.call('ZADD', KEYS[3], ARGV[4], ARGV[5])
`;

export const createDuel = async (redis: Redis, kind: DuelKind, expiryMs: number) => {
  const duelId = crypto.randomUUID();
  // Drawn once: both seats read the same words, and none is added during the Round.
  const words = drawWords(DUEL_WORD_COUNT, Math.random);
  await redis.client.eval(
    CREATE,
    3,
    duelKey(redis, duelId),
    roundKey(redis, duelId, 1),
    dueKey(redis),
    kind,
    JSON.stringify(words),
    expiryMs,
    Date.now() + expiryMs,
    duelId,
  );
  return duelId;
};

/**
 * A ranked Duel as the second acceptance of a Pairing creates it, in that acceptance's own step
 * rather than here: both seats are already held by the two Players, in the order given, so the
 * seat claim gives each of them theirs and refuses anyone else. It is recorded against both
 * Players until it is finalised, and first due once they had `connectMs` to connect.
 */
export const draftRankedDuel = (
  redis: Redis,
  players: readonly [RankedSeat, RankedSeat],
  { expiryMs, connectMs }: { readonly expiryMs: number; readonly connectMs: number },
) => {
  const duelId = crypto.randomUUID();
  const seats: Record<string, string> = Object.fromEntries(
    players.flatMap(({ playerId, nickname, avatarUrl, ornament, rank }, seat) => [
      [`holder${seat}`, playerId],
      [`name${seat}`, nickname],
      [`player${seat}`, playerId],
      [`rank${seat}`, JSON.stringify(rank)],
      [`ornament${seat}`, JSON.stringify(ornament)],
      // Left out without a picture: Redis holds no `null`.
      ...(avatarUrl === null ? [] : [[`avatar${seat}`, avatarUrl]]),
    ]),
  );
  const hashes: { key: string; fields: Record<string, string> }[] = [
    { key: duelKey(redis, duelId), fields: { kind: "ranked", round: "1", ...seats } },
    {
      key: roundKey(redis, duelId, 1),
      fields: { words: JSON.stringify(drawWords(DUEL_WORD_COUNT, Math.random)) },
    },
    ...players.map(({ playerId }) => ({ key: rankedDuelKey(redis, playerId), fields: { duelId } })),
  ];
  // Due once its Players had the time to connect: the sweep then announces the Countdown of its first
  // Round, whoever is there.
  return { duelId, hashes, expiryMs, due: { key: dueKey(redis), at: Date.now() + connectMs } };
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
    if ARGV[4] ~= '' then redis.call('HSET', KEYS[1], 'avatar' .. seat, ARGV[4]) end
    redis.call('HSET', KEYS[1], 'ornament' .. seat, ARGV[5])
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
    identity.avatarUrl ?? "",
    JSON.stringify(identity.ornament),
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

const readRound = async (redis: Redis, duelId: string, number: number): Promise<Round | null> => {
  const round = await redis.client.hgetall(roundKey(redis, duelId, number));
  if (round.words === undefined) return null;
  const anchorAts = SEATS.map((seat) => {
    const anchorAt = round[`anchor${seat}`];
    return anchorAt === undefined ? null : Number(anchorAt);
  });
  return {
    number,
    words: JSON.parse(round.words) as string[],
    startAt: round.startAt === undefined ? null : Number(round.startAt),
    announced: round.announced === "1",
    anchorAts,
    gamesEnded: SEATS.map((seat) => round[`ended${seat}`] === "1"),
    end: round.end === undefined ? null : (JSON.parse(round.end) as Round["end"]),
  };
};

/** The Rounds of a Duel from the first one to Round `upTo`, in order. */
export const readRounds = async (redis: Redis, duelId: string, upTo: number) => {
  const rounds: Round[] = [];
  for (let number = 1; number <= upTo; number += 1) {
    const round = await readRound(redis, duelId, number);
    if (round) rounds.push(round);
  }
  return rounds;
};

/** What a client is told of the finished Rounds among `rounds`. */
export const finishedRounds = (rounds: readonly Round[]) =>
  rounds.flatMap(({ end }): FinishedRound[] =>
    end === null
      ? []
      : [{ results: end.results, multipliers: end.multipliers, outcomes: end.outcomes }],
  );

export const readDuel = async (redis: Redis, duelId: string): Promise<Duel | null> => {
  const fields = await redis.client.hgetall(duelKey(redis, duelId));
  if (fields.round === undefined) return null;
  const round = await readRound(redis, duelId, Number(fields.round));
  // Only when the Duel expired between the two reads.
  if (!round) return null;
  const participants = SEATS.flatMap((seat): Participant[] => {
    const name = fields[`name${seat}`];
    if (name === undefined) return [];
    const avatarUrl = fields[`avatar${seat}`] ?? null;
    const ornament = JSON.parse(fields[`ornament${seat}`] ?? "null") as Ornament;
    const connected = fields[`connected${seat}`] === "1";
    return [{ seat, name, avatarUrl, ornament, connected }];
  });
  const holderIds = SEATS.map((seat) => fields[`holder${seat}`]);
  const playerIds = SEATS.map((seat) => fields[`player${seat}`] ?? null);
  const end = fields.end === undefined ? null : (JSON.parse(fields.end) as DuelEnd);
  const kind = fields.kind === "ranked" ? "ranked" : "custom";
  const rankOf = (seat: Seat) => JSON.parse(fields[`rank${seat}`] ?? "null") as Rank | null;
  return {
    kind,
    participants,
    holderIds,
    playerIds,
    ranks: kind === "ranked" ? [rankOf(0), rankOf(1)] : null,
    round,
    end,
  };
};

// Atomic, so that of every instance that could announce the Countdown of a Round, a single one
// does. Once announced, the Start never moves: a Participant who comes back gets the same instant.
// A Start fixed when the Round before ended is announced once its Countdown begins, whoever is
// connected; the Start of a Round without one is fixed here, once both seats are connected or
// when forced, whoever is there.
// Nothing is announced for a Round that is not the Duel's current one, nor for a Duel that expired.
// An announced Round is next due when its Games still open are to be closed.
const ANNOUNCE_START = `
if redis.call('HGET', KEYS[1], 'round') ~= ARGV[3] then return {} end
local startAt = redis.call('HGET', KEYS[2], 'startAt')
if redis.call('HGET', KEYS[2], 'announced') == '1' then return {startAt, '0'} end
if startAt then
  if tonumber(ARGV[1]) < tonumber(startAt) then return {} end
  redis.call('HSET', KEYS[2], 'announced', '1')
  redis.call('ZADD', KEYS[3], tonumber(startAt) + tonumber(ARGV[4]), ARGV[5])
  return {startAt, '1'}
end
if ARGV[6] ~= '1' and (redis.call('HGET', KEYS[1], 'connected0') ~= '1' or redis.call('HGET', KEYS[1], 'connected1') ~= '1') then return {} end
redis.call('HSET', KEYS[2], 'startAt', ARGV[1], 'announced', '1')
redis.call('ZADD', KEYS[3], tonumber(ARGV[1]) + tonumber(ARGV[4]), ARGV[5])
-- Counted again from the Start, so that a Duel joined late does not expire before it is finalised.
redis.call('PEXPIRE', KEYS[1], ARGV[2])
redis.call('PEXPIRE', KEYS[2], ARGV[2])
return {ARGV[1], '1'}
`;

/**
 * Announces the Countdown of `round`, `startAt` being the end of a Countdown that begins now. A
 * Start already fixed is announced once `startAt` has reached it; otherwise the Start is fixed at
 * `startAt` once both seats are connected, or at once when `forced`. Gives the Start instant, and
 * whether this call announced it, or `null` while there is nothing to announce yet.
 */
export const announceStart = async (
  redis: Redis,
  duelId: string,
  round: number,
  {
    startAt,
    expiryMs,
    forced = false,
  }: { readonly startAt: number; readonly expiryMs: number; readonly forced?: boolean },
): Promise<{ startAt: number; announced: boolean } | null> => {
  const answer: string[] = await redis.client.eval(
    ANNOUNCE_START,
    3,
    duelKey(redis, duelId),
    roundKey(redis, duelId, round),
    dueKey(redis),
    startAt,
    expiryMs,
    round,
    CLOSE_AFTER_MS,
    duelId,
    forced ? "1" : "0",
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

// Atomic, so that a Round ends exactly once, whichever instances see both of its Games ended: the
// end is recorded with what follows it, either the Duel being decided or the next Round, created
// with its Target words and a Start fixed at this moment. Only the instance that wins this step
// announces the end of the Round. The Duel is next due at once when it is decided, to be finalised,
// and otherwise when the Countdown of the next Round begins.
const END_ROUND = `
if redis.call('HGET', KEYS[1], 'round') ~= ARGV[1] then return 0 end
if redis.call('HGET', KEYS[2], 'ended0') ~= '1' or redis.call('HGET', KEYS[2], 'ended1') ~= '1' then return 0 end
if redis.call('HEXISTS', KEYS[2], 'end') == 1 then return 0 end
redis.call('HSET', KEYS[2], 'end', ARGV[2])
if ARGV[3] == '' then
  redis.call('HSET', KEYS[1], 'decided', '1')
else
  redis.call('HSET', KEYS[3], 'words', ARGV[4], 'startAt', ARGV[5])
  redis.call('PEXPIRE', KEYS[3], ARGV[6])
  redis.call('HSET', KEYS[1], 'round', ARGV[3])
end
redis.call('PEXPIRE', KEYS[1], ARGV[6])
redis.call('PEXPIRE', KEYS[2], ARGV[6])
redis.call('ZADD', KEYS[4], ARGV[7], ARGV[8])
return 1
`;

// Atomic, so that of every instance that sees the Duel decided, a single one finalises it at a
// time, and none once its end is recorded. The claim expires, so that a crash cannot hold it.
const CLAIM_FINALISATION = `
if redis.call('HGET', KEYS[1], 'decided') ~= '1' then return 0 end
if redis.call('HEXISTS', KEYS[1], 'end') == 1 then return 0 end
if redis.call('SET', KEYS[2], '1', 'NX', 'PX', ARGV[1]) then return 1 end
return 0
`;

// Does not recreate a Duel that expired meanwhile. A finalised Duel has nothing due any more, and
// is no longer recorded against its Players; a Player recorded against another Duel keeps it.
const RECORD_END = `
if redis.call('EXISTS', KEYS[1]) == 1 then redis.call('HSET', KEYS[1], 'end', ARGV[1]) end
redis.call('ZREM', KEYS[2], ARGV[2])
for player = 3, #KEYS do
  if redis.call('HGET', KEYS[player], 'duelId') == ARGV[2] then redis.call('DEL', KEYS[player]) end
end
`;

/**
 * Keeps the end of a finalised Duel, for a Participant who comes back after it, and stops
 * recording it against `playerIds`.
 */
export const recordEnd = async (
  redis: Redis,
  duelId: string,
  end: DuelEnd,
  playerIds: readonly (string | null)[],
) => {
  const players = playerIds.filter((playerId) => playerId !== null);
  await redis.client.eval(
    RECORD_END,
    2 + players.length,
    duelKey(redis, duelId),
    dueKey(redis),
    ...players.map((playerId) => rankedDuelKey(redis, playerId)),
    JSON.stringify(end),
    duelId,
  );
};

/** The ranked Duel the Player is in and that is not finalised yet, `null` when there is none. */
export const readUnfinishedRankedDuel = async (redis: Redis, playerId: string) => {
  const duelId = await redis.client.hget(rankedDuelKey(redis, playerId), "duelId");
  if (duelId === null) return null;
  const duel = await readDuel(redis, duelId);
  return duel === null || duel.end !== null ? null : duelId;
};

/** Whether this call claimed the finalisation of a Duel that its Rounds have decided. */
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

/** A Round as it is saved: what it was played on, its instants, and both Games with their journals. */
type PlayedRound = FinishedRound & {
  readonly number: number;
  readonly words: readonly string[];
  readonly startAt: number;
  readonly endedAt: number;
  readonly journals: readonly [GameEvent[], GameEvent[]];
};

// The ranked columns of a participant: the Standing before and after, and what the Duel changed.
const savedMove = ({ before, update }: StandingMove) => {
  const rankBefore = storedRank(before.rank);
  const rankAfter = storedRank(update.standing.rank);
  return {
    mmrBefore: before.mmr,
    mmrAfter: update.standing.mmr,
    duelsPlayedBefore: before.duelsPlayed,
    duelsPlayedAfter: update.standing.duelsPlayed,
    ladderIndexBefore: rankBefore.ladderIndex,
    lpBefore: rankBefore.lp,
    ladderIndexAfter: rankAfter.ladderIndex,
    lpAfter: rankAfter.lp,
    lpDelta: update.lpDelta,
    rankChange: update.rankChange,
  };
};

// Read back from what was saved rather than from what was just computed, so that a finalisation
// retried after its save tells both Players what the first one would have.
const readRankedEnds = async (tx: Transaction, duelId: string) => {
  const participants = await tx
    .select()
    .from(duelParticipant)
    .where(eq(duelParticipant.duelId, duelId))
    .orderBy(duelParticipant.seat);
  const ends = participants.map((participant): RankedEnd => {
    const { duelsPlayedAfter, ladderIndexAfter, lpAfter, lpDelta, rankChange } = participant;
    if (duelsPlayedAfter === null || lpDelta === null || rankChange === null)
      throw new Error(`Ranked Duel ${duelId} was saved without the Standing of a Player`);
    const rank = rankFromStored(ladderIndexAfter, lpAfter);
    return { lpDelta, rankChange, ...visibleStanding({ duelsPlayed: duelsPlayedAfter, rank }) };
  });
  const [first, second] = ends;
  if (!first || !second) throw new Error(`Duel ${duelId} was saved without both participants`);
  return [first, second] as const;
};

/**
 * Saves a decided Duel with every Round, their Games and both participants in one transaction,
 * which also moves both Standings when the Duel is ranked. A Duel saved already, by a finalisation
 * that failed after its save, is not saved again, and no Standing moves twice. Gives what a ranked
 * Duel did to each Player's Standing, indexed by seat, `null` for a Custom Duel.
 */
export const saveDuel = async (
  db: Db,
  duelId: string,
  played: {
    readonly kind: DuelKind;
    readonly playerIds: readonly (string | null)[];
    /** The Outcomes of the Duel, indexed by seat. */
    readonly outcomes: readonly [Outcome, Outcome];
    readonly rounds: readonly PlayedRound[];
  },
) => {
  const { kind, playerIds, outcomes, rounds } = played;
  const first = rounds.at(0);
  const last = rounds.at(-1);
  if (!first || !last) throw new Error(`Duel ${duelId} has ended without a Round`);
  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(duel)
      .values({
        id: duelId,
        kind,
        config: DUEL_GAME_CONFIG,
        startedAt: new Date(first.startAt),
        endedAt: new Date(last.endedAt),
      })
      .onConflictDoNothing()
      .returning({ id: duel.id });
    if (inserted.length === 0) return kind === "ranked" ? readRankedEnds(tx, duelId) : null;
    await tx.insert(duelRound).values(
      rounds.map((round) => ({
        duelId,
        round: round.number,
        words: [...round.words],
        startedAt: new Date(round.startAt),
        endedAt: new Date(round.endedAt),
      })),
    );
    await tx.insert(duelGame).values(
      rounds.flatMap((round) =>
        SEATS.map((seat) => ({
          duelId,
          round: round.number,
          seat,
          result: round.results[seat],
          journal: round.journals[seat],
          outcome: round.outcomes[seat],
          multiplier: round.multipliers[seat],
        })),
      ),
    );
    const [firstPlayerId, secondPlayerId] = playerIds;
    if (kind === "ranked" && (!firstPlayerId || !secondPlayerId))
      throw new Error(`Ranked Duel ${duelId} has a seat without a Player`);
    const moves =
      kind === "ranked" && firstPlayerId && secondPlayerId
        ? await moveStandings(tx, [firstPlayerId, secondPlayerId], outcomes)
        : null;
    await tx.insert(duelParticipant).values(
      SEATS.map((seat) => {
        const move = moves?.[seat];
        return {
          duelId,
          seat,
          playerId: playerIds[seat] ?? null,
          outcome: outcomes[seat],
          ...(move && savedMove(move)),
        };
      }),
    );
    return moves && readRankedEnds(tx, duelId);
  });
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

/** The delays a Duel moves from one Round to the next by. */
export type RoundDelays = {
  readonly expiryMs: number;
  readonly countdownMs: number;
  /** Between the end of a Round and the Countdown of the next one. */
  readonly roundPauseMs: number;
};

/**
 * Saves a Duel that its Rounds have decided, keeps its end and announces it to both Participants.
 * Run by whichever instance sees it decided: the claim lets only one of them through, and is let
 * go when the finalisation fails, so that it can be tried again.
 */
const finaliseDuel = async (
  db: Db,
  redis: Redis,
  relay: Pick<Relay, "publish">,
  duelId: string,
) => {
  if (!(await claimFinalisation(redis, duelId))) return;
  try {
    const duel = await readDuel(redis, duelId);
    // Expired meanwhile: nothing is left to save.
    if (!duel) return;
    const rounds: PlayedRound[] = [];
    for (const { number, words, startAt, end } of await readRounds(
      redis,
      duelId,
      duel.round.number,
    )) {
      if (startAt === null || end === null)
        throw new Error(`Round ${number} of Duel ${duelId} has not ended`);
      const journals = await readJournals(redis, duelId, number);
      rounds.push({ number, words, startAt, journals, ...end });
    }
    const outcomes = getDuelOutcomes(rounds.map((round) => round.outcomes));
    if (outcomes === null) throw new Error(`Duel ${duelId} is not decided`);
    const { kind, playerIds } = duel;
    const ranked = await saveDuel(db, duelId, { kind, playerIds, outcomes, rounds });
    const end = {
      type: "end",
      outcomes,
      ranked,
      rounds: rounds.map(({ results, multipliers, outcomes: roundOutcomes }) => ({
        results,
        multipliers,
        outcomes: roundOutcomes,
      })),
    } as const;
    await recordEnd(redis, duelId, end, playerIds);
    await relay.publish(duelId, null, end);
  } catch (error) {
    await releaseFinalisation(redis, duelId);
    throw error;
  }
};

/**
 * Ends `round` at `now` once both of its Games have ended: judges it from their journals, and
 * either creates the next Round, whose Start is fixed at this moment, or finalises the Duel when it
 * is decided. Run by whichever instance sees both Games ended; the Round ends once all the same.
 */
export const endRound = async (
  db: Db,
  redis: Redis,
  relay: Pick<Relay, "publish">,
  duelId: string,
  round: number,
  { expiryMs, countdownMs, roundPauseMs }: RoundDelays,
  now: number,
) => {
  const rounds = await readRounds(redis, duelId, round);
  const current = rounds.at(-1);
  const isOver = current?.gamesEnded.every((ended) => ended) === true;
  if (current?.number === round && rounds.length === round && current.end === null && isOver) {
    const journals = await readJournals(redis, duelId, round);
    const games = [
      replayGame(current.words, journals[0]),
      replayGame(current.words, journals[1]),
    ] as const;
    const results = [getResult(games[0]), getResult(games[1])] as const;
    // Judged from the replayed Keystrokes, never reported by a client (ADR 0013).
    const multipliers = [getAverageMultiplier(games[0]), getAverageMultiplier(games[1])] as const;
    const measures = [
      { ...results[0], multiplier: multipliers[0] },
      { ...results[1], multiplier: multipliers[1] },
    ] as const;
    const outcomes = [
      getOutcome(measures[0], measures[1]),
      getOutcome(measures[1], measures[0]),
    ] as const;
    const earlier = finishedRounds(rounds).map((finished) => finished.outcomes);
    const decided = getDuelOutcomes([...earlier, outcomes]) !== null;
    const endedAt = now;
    const nextStartAt = decided ? null : endedAt + roundPauseMs + countdownMs;
    const ended: number = await redis.client.eval(
      END_ROUND,
      4,
      duelKey(redis, duelId),
      roundKey(redis, duelId, round),
      roundKey(redis, duelId, round + 1),
      dueKey(redis),
      round,
      JSON.stringify({ results, multipliers, outcomes, endedAt }),
      decided ? "" : round + 1,
      // Drawn anew: no Round is played on the Target words of another.
      JSON.stringify(drawWords(DUEL_WORD_COUNT, Math.random)),
      nextStartAt ?? "",
      expiryMs,
      nextStartAt === null ? endedAt : nextStartAt - countdownMs,
      duelId,
    );
    if (ended === 1)
      await relay.publish(duelId, null, {
        type: "roundEnd",
        round,
        results,
        multipliers,
        outcomes,
        nextStartAt,
      });
  }
  await finaliseDuel(db, redis, relay, duelId);
};

/**
 * Announces the Countdown of `round` to both Participants once it begins, whoever is connected:
 * its Start was fixed when the Round before it ended, or is `forced` at `startAt`.
 */
const announceCountdown = async (
  redis: Redis,
  relay: Pick<Relay, "publish">,
  duelId: string,
  round: number,
  start: { readonly startAt: number; readonly expiryMs: number; readonly forced?: boolean },
) => {
  const announced = await announceStart(redis, duelId, round, start);
  if (!announced?.announced) return;
  const duel = await readDuel(redis, duelId);
  if (duel?.round.number !== round) return;
  const { words } = duel.round;
  await relay.publish(duelId, null, {
    type: "countdown",
    round,
    startAt: announced.startAt,
    words,
  });
};
/**
 * Ends the Games of `round` whose clients went silent, at their start plus 30 seconds, then ends
 * the Round. A Game that never started is started at the Start of the Round.
 */
const closeOverdueGames = async (
  db: Db,
  redis: Redis,
  relay: Pick<Relay, "publish">,
  duelId: string,
  round: number,
  delays: RoundDelays,
  now: number,
) => {
  const duel = await readDuel(redis, duelId);
  if (!duel) return;
  const { number, words, startAt } = duel.round;
  if (number === round && startAt !== null) {
    const journals = await readJournals(redis, duelId, round);
    for (const seat of SEATS) {
      const game = replayGame(words, journals[seat]);
      if (game.status === "finished") continue;
      const events = closingEvents(journals[seat], startAt);
      const { expiryMs } = delays;
      await appendEvents(redis, duelId, round, seat, events, { ends: true, expiryMs });
    }
  }
  await endRound(db, redis, relay, duelId, round, delays, now);
};

/** How often an instance sweeps the Duels that have something due. */
export const DUEL_SWEEP_INTERVAL_MS = 100;

/**
 * Takes a due Duel one step forward, whatever is due at `now`: the Countdown of a Round to
 * announce, its Games still open to close, which ends the Round, or the Duel to finalise. Run again,
 * or by two instances at once, it does nothing more: each of these steps is atomic.
 */
const advanceDuel = async (
  db: Db,
  redis: Redis,
  relay: Pick<Relay, "publish">,
  duelId: string,
  delays: RoundDelays,
  now: number,
) => {
  const duel = await readDuel(redis, duelId);
  // Expired, or finalised by an instance that stopped before forgetting it.
  if (!duel || duel.end) {
    await redis.client.send("ZREM", [dueKey(redis), duelId]);
    return;
  }
  const { number, startAt, announced, end } = duel.round;
  // The current Round has ended only once the Duel is decided: its finalisation failed so far.
  if (end !== null) {
    await finaliseDuel(db, redis, relay, duelId);
    return;
  }
  const { expiryMs, countdownMs } = delays;
  // Still waiting for its first Start. A Custom Duel is due only once it has expired; a ranked one
  // once its Players had the time to connect, when its Countdown begins whoever is there.
  if (startAt === null) {
    if (duel.kind === "ranked")
      await announceCountdown(redis, relay, duelId, number, {
        startAt: now + countdownMs,
        expiryMs,
        forced: true,
      });
    return;
  }
  if (!announced) {
    if (now >= startAt - countdownMs)
      await announceCountdown(redis, relay, duelId, number, {
        startAt: Math.max(now + countdownMs, startAt),
        expiryMs,
      });
    return;
  }
  if (now >= startAt + CLOSE_AFTER_MS)
    await closeOverdueGames(db, redis, relay, duelId, number, delays, now);
};

/**
 * Advances every Duel that has something due at `now`, whether or not anyone is connected to it.
 * Each instance runs it periodically; a step that fails leaves its Duel due, so that it is tried
 * again at the next sweep, until it succeeds or the Duel expires.
 */
export const sweepDuels = async (
  db: Db,
  redis: Redis,
  relay: Pick<Relay, "publish">,
  delays: RoundDelays,
  now: number,
  logger: Logger,
) => {
  const due: string[] = await redis.client.send("ZRANGEBYSCORE", [
    dueKey(redis),
    "-inf",
    String(now),
  ]);
  await Promise.all(
    due.map((duelId) =>
      advanceDuel(db, redis, relay, duelId, delays, now).catch((error: unknown) =>
        logger.error("Could not advance Duel {duelId}", { duelId, error }),
      ),
    ),
  );
};
