import { MAX_ROUNDS, ROUNDS_TO_WIN } from "./constants.ts";
import type { Outcome } from "./outcome.ts";

/** The Outcomes of one Round, indexed by seat. */
export type RoundOutcomes = readonly [Outcome, Outcome];

/** The Rounds each Participant won so far, indexed by seat. A drawn Round counts for neither. */
export const getRoundScore = (rounds: readonly RoundOutcomes[]): readonly [number, number] => {
  const wins = (seat: 0 | 1) => rounds.filter((outcomes) => outcomes[seat] === "win").length;
  return [wins(0), wins(1)];
};

/**
 * The Outcomes of a Duel, indexed by seat, from the Outcomes of its Rounds so far: `null` while
 * another Round is still to be played.
 */
export const getDuelOutcomes = (rounds: readonly RoundOutcomes[]): RoundOutcomes | null => {
  const [own, opponent] = getRoundScore(rounds);
  if (Math.max(own, opponent) < ROUNDS_TO_WIN && rounds.length < MAX_ROUNDS) return null;
  if (own === opponent) return ["draw", "draw"];
  return own > opponent ? ["win", "loss"] : ["loss", "win"];
};
