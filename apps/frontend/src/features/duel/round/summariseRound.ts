import {
  type FinishedRound,
  getRoundPoints,
  opponentSeat,
  type Participant,
  type Seat,
} from "@repo/duel-engine";
import type { Result } from "@repo/typing-engine";

/**
 * One side of a finished Round: who played it, their Result, the average Multiplier the server
 * judged it with and the Points they are worth.
 */
export type RoundSummarySide = {
  readonly seat: Seat;
  readonly name: string;
  readonly result: Result;
  readonly multiplier: number;
  readonly points: number;
};

/**
 * A finished Round as the Participant sitting on `seat` is shown it: their own Outcome, and both
 * Results with the name of who played them and the Points that decided the Round, their own first.
 */
export function summariseRound(
  round: FinishedRound,
  {
    number,
    seat,
    participants,
  }: {
    readonly number: number;
    readonly seat: Seat;
    readonly participants: readonly Participant[];
  },
) {
  const sides = [seat, opponentSeat(seat)].map((side): RoundSummarySide => ({
    seat: side,
    name: participants.find((participant) => participant.seat === side)?.name ?? "",
    result: round.results[side],
    multiplier: round.multipliers[side],
    points: getRoundPoints(round, side),
  }));
  return { number, outcome: round.outcomes[seat], sides };
}
