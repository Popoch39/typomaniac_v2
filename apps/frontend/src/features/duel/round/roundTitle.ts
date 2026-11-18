import type { Outcome } from "@repo/duel-engine";

const ROUND_OUTCOME_LABELS: Record<Outcome, string> = {
  win: "You win the Round",
  loss: "You lose the Round",
  draw: "Round drawn",
};

/** How a finished Round is headed for the Participant whose Outcome it is. */
export function roundTitle(number: number, outcome: Outcome) {
  return `Round ${number}: ${ROUND_OUTCOME_LABELS[outcome]}`;
}
