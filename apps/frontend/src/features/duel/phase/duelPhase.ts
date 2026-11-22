import {
  DUEL_GAME_CONFIG,
  type FinishedRound,
  opponentSeat,
  type Participant,
  type RankedEnd,
  type RoundOutcomes,
  type Seat,
  type ServerMessage,
} from "@repo/duel-engine";
import type { Rank } from "@repo/ranked-engine";
import { applyEvent, createGame, type Game, type GameEvent } from "@repo/typing-engine";
import type { SocketLink } from "../../../shared/link/socketLink.ts";

/**
 * The Outcomes of the Duel and, for a ranked Duel, what it did to each Player's Standing, both
 * indexed by seat.
 */
export type DuelEnd = {
  readonly outcomes: RoundOutcomes;
  readonly ranked: readonly [RankedEnd, RankedEnd] | null;
};

/** A phase of a seated Participant whose Duel is still under way. */
type SeatedPhase =
  /**
   * Seated, the Countdown of `round` still to come. `journal` is the Participant's own, handed back
   * on returning mid-Game: the Countdown that follows resumes it.
   */
  | { readonly kind: "waiting"; readonly round: number; readonly journal: readonly GameEvent[] }
  | { readonly kind: "countdown"; readonly round: number; readonly words: readonly string[] }
  | { readonly kind: "running"; readonly round: number; readonly words: readonly string[] }
  /** Between two Rounds, or after the last one: the Round that just ended is shown. */
  | { readonly kind: "roundEnd"; readonly round: number };

export type DuelLifecycle =
  | { readonly kind: "connecting" }
  /** Why the Participant could not take a seat, in words for the user. */
  | { readonly kind: "refused"; readonly refusal: string }
  | SeatedPhase
  /**
   * The socket dropped and is being reopened: the phase it dropped in stays shown until the server
   * says where the Duel is. `round` and `journal` are as the server handed them back on reopening.
   */
  | {
      readonly kind: "rejoining";
      readonly dropped: SeatedPhase;
      readonly round: number;
      readonly journal: readonly GameEvent[];
    }
  | { readonly kind: "finished"; readonly end: DuelEnd }
  /** The reason the server gave as it closed the socket for good. */
  | { readonly kind: "disconnected"; readonly closeReason: string };

/** The phase the Duel screen shows. */
export type ShownPhase = Exclude<DuelLifecycle, { readonly kind: "rejoining" }>;
export type DuelPhase = ShownPhase["kind"];

export type Duel = {
  readonly lifecycle: DuelLifecycle;
  readonly seat: Seat | null;
  readonly participants: readonly Participant[];
  /** The Rank of each Player of a ranked Duel, indexed by seat; `null` for a Custom Duel. */
  readonly ranks: readonly [Rank | null, Rank | null] | null;
  /** The Rounds already finished, in order: the Round score is counted from them. */
  readonly rounds: readonly FinishedRound[];
  /**
   * The Opponent's Game, replayed from their Events to place their caret and read their WPM;
   * `null` until the Target words are known.
   */
  readonly opponentGame: Game | null;
};

export type DuelEvent =
  | { readonly kind: "message"; readonly message: ServerMessage }
  | { readonly kind: "link"; readonly link: SocketLink }
  /** The Participant's Game of `round` started, or resumed. */
  | { readonly kind: "run"; readonly round: number; readonly words: readonly string[] };

export type DuelEffect =
  /** Runs the ping/pong exchanges that estimate the clock offset. */
  | { readonly kind: "synchronise" }
  | { readonly kind: "pong"; readonly clientAt: number; readonly serverAt: number }
  /** Counts down to the next Round's Start, starting nothing at its end. */
  | { readonly kind: "showNextStart"; readonly startAt: number }
  /** Starts the Round of the Countdown at `startAt`, given in server time. */
  | { readonly kind: "schedule"; readonly startAt: number }
  /** Resumes the Participant's Game from `journal`, on the clock it was started on. */
  | {
      readonly kind: "resume";
      readonly round: number;
      readonly words: readonly string[];
      readonly journal: readonly GameEvent[];
      readonly startAt: number;
    }
  /** Stops the Countdown, the resume and the forwarding of Events. */
  | { readonly kind: "stopRound" }
  /** Stops the ping/pong exchanges under way: their socket dropped. */
  | { readonly kind: "stopSync" }
  /** Freezes the Participant's Game: keys typed now would never reach the server. */
  | { readonly kind: "freeze" }
  | { readonly kind: "closeSocket" }
  /** The server ended the Duel; `own` is what a ranked one did to the Participant's Standing. */
  | { readonly kind: "ended"; readonly own: RankedEnd | null };

export const INITIAL_DUEL: Duel = {
  lifecycle: { kind: "connecting" },
  seat: null,
  participants: [],
  ranks: null,
  rounds: [],
  opponentGame: null,
};

type Transition = { readonly duel: Duel; readonly effects: readonly DuelEffect[] };

export function shownPhase(lifecycle: DuelLifecycle): ShownPhase {
  return lifecycle.kind === "rejoining" ? lifecycle.dropped : lifecycle;
}

/** The Round being played, or the last one played; `null` before any is known and once the Duel is over. */
export function roundOf(lifecycle: DuelLifecycle) {
  switch (lifecycle.kind) {
    case "waiting":
    case "countdown":
    case "running":
    case "roundEnd":
    case "rejoining":
      return lifecycle.round;
    case "connecting":
    case "refused":
    case "finished":
    case "disconnected":
      return null;
  }
}

/** The phases shown on the Broadcast screen, under its band; `null` for the others. */
export function broadcastPhase(phase: DuelPhase) {
  switch (phase) {
    case "countdown":
    case "running":
    case "roundEnd":
    case "finished":
      return phase;
    case "connecting":
    case "refused":
    case "waiting":
    case "disconnected":
      return null;
  }
}

export type BroadcastPhase = NonNullable<ReturnType<typeof broadcastPhase>>;

const withParticipant = (participants: readonly Participant[], participant: Participant) =>
  [...participants.filter(({ seat }) => seat !== participant.seat), participant].toSorted(
    (a, b) => a.seat - b.seat,
  );

function followLink(duel: Duel, link: SocketLink): Transition {
  const { lifecycle } = duel;
  switch (link.kind) {
    case "refused":
      return {
        duel: { ...duel, lifecycle: { kind: "refused", refusal: link.refusal } },
        effects: [],
      };
    case "backoff": {
      // The server closes nothing a finished Duel still needs.
      if (lifecycle.kind === "finished") return { duel, effects: [{ kind: "closeSocket" }] };
      const rejoining: DuelLifecycle =
        lifecycle.kind === "waiting" ||
        lifecycle.kind === "countdown" ||
        lifecycle.kind === "running" ||
        lifecycle.kind === "roundEnd"
          ? { kind: "rejoining", dropped: lifecycle, round: lifecycle.round, journal: [] }
          : lifecycle;
      // Keys typed now would never reach the server, which rebuilds the Game from its journal on
      // resume; buffering them would move them up to their receipt bound (ADR 0009).
      return {
        duel: { ...duel, lifecycle: rejoining },
        effects: [{ kind: "stopSync" }, { kind: "stopRound" }, { kind: "freeze" }],
      };
    }
    case "down":
      if (lifecycle.kind === "finished") return { duel, effects: [] };
      return {
        duel: { ...duel, lifecycle: { kind: "disconnected", closeReason: link.reason } },
        effects: [{ kind: "stopSync" }, { kind: "stopRound" }],
      };
    case "idle":
    case "opening":
    case "open":
    case "refusing":
      return { duel, effects: [] };
  }
}

function run(duel: Duel, round: number, words: readonly string[]): Transition {
  const { kind } = duel.lifecycle;
  if (kind !== "countdown" && kind !== "waiting" && kind !== "rejoining")
    return { duel, effects: [] };
  return { duel: { ...duel, lifecycle: { kind: "running", round, words } }, effects: [] };
}

function receive(duel: Duel, message: ServerMessage): Transition {
  const { lifecycle } = duel;
  switch (message.type) {
    case "state": {
      const opponentJournal = message.journals[opponentSeat(message.seat)];
      // Only an accepted start opens a journal: a non-empty one means the Participant is back
      // mid-Game, which resumes with the Countdown that follows, once the announced Start is known.
      const journal = message.journals[message.seat];
      const { round, words, rounds, startAt } = message;
      // Back between two Rounds, or after the last one: the Round that just ended is shown, until
      // the Countdown of the next one or the end of the Duel.
      const afterRound = rounds.length > 0 && (words === null || rounds.length >= round);
      // Back in a Round under way, whose Countdown follows: the screen it dropped on stays until then.
      const next: DuelLifecycle = afterRound
        ? { kind: "roundEnd", round }
        : lifecycle.kind === "rejoining" && words !== null
          ? { ...lifecycle, round, journal }
          : { kind: "waiting", round, journal };
      return {
        duel: {
          lifecycle: next,
          seat: message.seat,
          participants: message.participants,
          ranks: message.ranks,
          rounds,
          // Without the Target words, the Countdown is still to come and brings them.
          opponentGame:
            words === null
              ? null
              : opponentJournal.reduce(applyEvent, createGame(DUEL_GAME_CONFIG, words)),
        },
        effects:
          afterRound && startAt !== null
            ? [{ kind: "synchronise" }, { kind: "showNextStart", startAt }]
            : [{ kind: "synchronise" }],
      };
    }
    case "presence":
      return {
        duel: { ...duel, participants: withParticipant(duel.participants, message.participant) },
        effects: [],
      };
    case "pong":
      return {
        duel,
        effects: [{ kind: "pong", clientAt: message.clientAt, serverAt: message.serverAt }],
      };
    case "opponentEvent":
      if (duel.opponentGame === null) return { duel, effects: [] };
      return {
        duel: { ...duel, opponentGame: applyEvent(duel.opponentGame, message.event) },
        effects: [],
      };
    case "countdown": {
      const { round, words, startAt } = message;
      // A Round already finished has no Start left to wait for.
      if (round <= duel.rounds.length) return { duel, effects: [] };
      // A Participant seated before the Countdown learns the Target words of the Round from it.
      const opponentGame =
        round !== roundOf(lifecycle) || duel.opponentGame === null
          ? createGame(DUEL_GAME_CONFIG, words)
          : duel.opponentGame;
      const withWords = { ...duel, opponentGame };
      // A Game already running or over has no Start left to wait for, unless it ran on a socket
      // that dropped since.
      if (
        lifecycle.kind !== "waiting" &&
        lifecycle.kind !== "rejoining" &&
        lifecycle.kind !== "countdown" &&
        lifecycle.kind !== "roundEnd"
      )
        return { duel: withWords, effects: [] };
      // The journal handed back on joining is the one of the Round joined, not of a later one.
      const journal =
        (lifecycle.kind === "waiting" || lifecycle.kind === "rejoining") &&
        lifecycle.round === round
          ? lifecycle.journal
          : [];
      // The resumed Game runs once the clock offset places its Start: until then, its phase stays.
      if (journal.length > 0)
        return {
          duel: withWords,
          effects: [{ kind: "resume", round, words, journal, startAt }],
        };
      return {
        duel: { ...withWords, lifecycle: { kind: "countdown", round, words } },
        effects: [{ kind: "schedule", startAt }],
      };
    }
    case "roundEnd": {
      // Only the Round that follows the finished ones: the state may already list this one.
      if (message.round !== duel.rounds.length + 1) return { duel, effects: [] };
      const { results, multipliers, outcomes, nextStartAt } = message;
      return {
        duel: {
          ...duel,
          lifecycle: { kind: "roundEnd", round: message.round },
          rounds: [...duel.rounds, { results, multipliers, outcomes }],
          opponentGame: null,
        },
        effects:
          nextStartAt === null
            ? [{ kind: "stopRound" }]
            : [{ kind: "stopRound" }, { kind: "showNextStart", startAt: nextStartAt }],
      };
    }
    case "end": {
      const { outcomes, ranked } = message;
      return {
        duel: {
          ...duel,
          lifecycle: { kind: "finished", end: { outcomes, ranked } },
          rounds: message.rounds,
        },
        effects: [
          { kind: "stopRound" },
          { kind: "ended", own: ranked === null || duel.seat === null ? null : ranked[duel.seat] },
        ],
      };
    }
  }
}

export function nextDuel(duel: Duel, event: DuelEvent): Transition {
  switch (event.kind) {
    case "message":
      return receive(duel, event.message);
    case "link":
      return followLink(duel, event.link);
    case "run":
      return run(duel, event.round, event.words);
  }
}
