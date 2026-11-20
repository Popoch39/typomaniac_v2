import type { ReviewEnding } from "./reviewEnding.ts";

const LINES: Readonly<Record<ReviewEnding, string>> = {
  cleared: "Settled: the Player is cleared.",
  voided_duels: "Settled: the chosen Duels are voided.",
  suspension: "Settled: the Player is suspended.",
  ban: "Settled: the Player is banned.",
};

/** How a Review the administrator just settled ended, as the page says it. */
export function settledLine(ending: ReviewEnding) {
  return LINES[ending];
}
