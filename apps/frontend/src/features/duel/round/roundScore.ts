import { type FinishedRound, getRoundScore, opponentSeat, type Seat } from "@repo/duel-engine";

/** The Round score as the Participant sitting on `seat` reads it: their own Rounds won first. */
export function ownRoundScore(rounds: readonly FinishedRound[], seat: Seat) {
  const score = getRoundScore(rounds.map((round) => round.outcomes));
  return { own: score[seat], opponent: score[opponentSeat(seat)] };
}
