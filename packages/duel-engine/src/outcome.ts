import type { Result } from "@repo/typing-engine";
import { getPoints } from "./points.ts";

/** What a Round or a Duel means for one Participant. */
export type Outcome = "win" | "loss" | "draw";

/** The Outcome of a Round for the Participant whose Result is `own`, against the Opponent's Result. */
export function getOutcome(own: Result, opponent: Result): Outcome {
  const ownPoints = getPoints(own);
  const opponentPoints = getPoints(opponent);
  // Equal Points are a draw: a tie-break would decide the Round on a difference nobody sees.
  if (ownPoints === opponentPoints) return "draw";
  return ownPoints > opponentPoints ? "win" : "loss";
}
