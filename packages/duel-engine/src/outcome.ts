import { getPoints, type PointsMeasures } from "./points.ts";

/** What a Round or a Duel means for one Participant. */
export type Outcome = "win" | "loss" | "draw";

/**
 * The Outcome of a Round for the Participant whose Game measured `own`, against the Opponent's,
 * each with the average Multiplier of its Game.
 */
export function getOutcome(own: PointsMeasures, opponent: PointsMeasures): Outcome {
  const ownPoints = getPoints(own);
  const opponentPoints = getPoints(opponent);
  // Equal Points are a draw: a tie-break would decide the Round on a difference nobody sees.
  if (ownPoints === opponentPoints) return "draw";
  return ownPoints > opponentPoints ? "win" : "loss";
}
