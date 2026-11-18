import type { GameEvent, Result } from "@repo/typing-engine";
import type { Outcome } from "./outcome.ts";

/** A Participant's place in a Duel; it indexes the pairs of journals, Results and Outcomes. */
export type Seat = 0 | 1;

export type Participant = {
  readonly seat: Seat;
  /** The Player's Nickname, or the Guest's generated display name. */
  readonly name: string;
  readonly connected: boolean;
};

/** Timestamps are milliseconds since the epoch, each on the clock of the side that sets it. */
export type ClientMessage =
  | { readonly type: "ping"; readonly clientAt: number }
  | { readonly type: "event"; readonly event: GameEvent };

export type ServerMessage =
  /** `clientAt` echoes the ping, so the client can estimate the offset between the two clocks. */
  | { readonly type: "pong"; readonly clientAt: number; readonly serverAt: number }
  /** Sent on joining and on reconnecting: the journals are replayed to restore both Games. */
  | {
      readonly type: "state";
      readonly seat: Seat;
      readonly words: readonly string[];
      readonly participants: readonly Participant[];
      readonly journals: readonly [readonly GameEvent[], readonly GameEvent[]];
    }
  | { readonly type: "presence"; readonly participant: Participant }
  /** `startAt` is in server time: the client converts it with its clock offset. */
  | { readonly type: "countdown"; readonly startAt: number }
  | { readonly type: "opponentEvent"; readonly event: GameEvent }
  | {
      readonly type: "end";
      readonly results: readonly [Result, Result];
      readonly outcomes: readonly [Outcome, Outcome];
    };
