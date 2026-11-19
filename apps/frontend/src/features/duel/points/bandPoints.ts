import { type FinishedRound, getRoundPoints, opponentSeat, type Seat } from "@repo/duel-engine";

/**
 * Both Points the band shows, the Participant's own first: live during a Round; outside one, those
 * of the last finished Round stay in view, and 0 and 0 before Round 1.
 */
export function bandPoints({
  isLive,
  live,
  lastRound,
  seat,
}: {
  readonly isLive: boolean;
  readonly live: { readonly own: number; readonly opponent: number };
  readonly lastRound: FinishedRound | undefined;
  readonly seat: Seat;
}): readonly [number, number] {
  if (isLive) return [live.own, live.opponent];
  if (lastRound === undefined) return [0, 0];
  return [getRoundPoints(lastRound, seat), getRoundPoints(lastRound, opponentSeat(seat))];
}
