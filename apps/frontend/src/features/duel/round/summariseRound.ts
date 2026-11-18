import {
  type FinishedRound,
  getPoints,
  opponentSeat,
  type Participant,
  type Seat,
} from "@repo/duel-engine";
import type { Result } from "@repo/typing-engine";

/** One side of a finished Round: who played it, their Result and the Points it is worth. */
export type RoundSummarySide = {
  readonly seat: Seat;
  readonly name: string;
  readonly result: Result;
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
    points: getPoints(round.results[side]),
  }));
  return { number, outcome: round.outcomes[seat], sides };
}
