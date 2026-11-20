import {
  progressSummaryLines,
  type ProgressSummary,
  winRateLabel,
} from "../summary/progressSummary.ts";

/** The win rate of the period and kind chosen, and the Duels it is made of, by Duel Outcome. */
export function useWinRateTile(summary: ProgressSummary) {
  return { rate: winRateLabel(summary), lines: progressSummaryLines(summary) };
}
