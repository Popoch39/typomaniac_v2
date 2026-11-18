import type { GameEvent, Result } from "@repo/typing-engine";
import type { RoundOutcomes } from "./rounds.ts";

/** A Participant's place in a Duel; it indexes the pairs of journals, Results and Outcomes. */
export type Seat = 0 | 1;

export type Participant = {
  readonly seat: Seat;
  /** The Player's Nickname, or the Guest's generated display name. */
  readonly name: string;
  readonly connected: boolean;
};

/** A Round whose two Games are over: both Results and both Outcomes of the Round, indexed by seat. */
export type FinishedRound = {
  readonly results: readonly [Result, Result];
  readonly outcomes: RoundOutcomes;
};

/** Timestamps are milliseconds since the epoch, each on the clock of the side that sets it. */
export type ClientMessage =
  | { readonly type: "ping"; readonly clientAt: number }
  /** `round` names the Round the Event is played in: the server ignores one of another Round. */
  | { readonly type: "event"; readonly round: number; readonly event: GameEvent };

export type ServerMessage =
  /** `clientAt` echoes the ping, so the client can estimate the offset between the two clocks. */
  | { readonly type: "pong"; readonly clientAt: number; readonly serverAt: number }
  /**
   * Sent on joining and on reconnecting: the journals of the current Round are replayed to restore
   * both Games. Rounds are numbered from 1. `rounds` are the Rounds already finished, in order: the
   * Round score is counted from them. `startAt` is the Start of the current Round in server time,
   * `null` until it is fixed: the first Round's is fixed with its Countdown, a later Round's when
   * the Round before it ends. `words` are the Round's Target words, `null` until its Countdown is
   * announced.
   */
  | {
      readonly type: "state";
      readonly seat: Seat;
      readonly round: number;
      readonly rounds: readonly FinishedRound[];
      readonly startAt: number | null;
      readonly words: readonly string[] | null;
      readonly participants: readonly Participant[];
      readonly journals: readonly [readonly GameEvent[], readonly GameEvent[]];
    }
  | { readonly type: "presence"; readonly participant: Participant }
  /**
   * Announces the Start of a Round with its Target words, which no client holds before it.
   * `startAt` is in server time: the client converts it with its clock offset.
   */
  | {
      readonly type: "countdown";
      readonly round: number;
      readonly startAt: number;
      readonly words: readonly string[];
    }
  | { readonly type: "opponentEvent"; readonly event: GameEvent }
  /**
   * Ends a Round with both Results and both Outcomes. `nextStartAt` is the Start of the next
   * Round in server time, whose Countdown follows on its own; `null` when the Duel is decided.
   */
  | ({
      readonly type: "roundEnd";
      readonly round: number;
      readonly nextStartAt: number | null;
    } & FinishedRound)
  /** Ends the Duel with its Outcomes, indexed by seat, and every Round played. */
  | {
      readonly type: "end";
      readonly outcomes: RoundOutcomes;
      readonly rounds: readonly FinishedRound[];
    };
