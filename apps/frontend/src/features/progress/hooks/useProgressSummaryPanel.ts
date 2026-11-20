import type { Tier } from "@repo/ranked-engine";
import {
  peakTierLine,
  progressSummaryLines,
  type ProgressSummary,
} from "../summary/progressSummary.ts";

/** The summary's lines for the period and kind chosen, and the Player's Peak Tier, of all time. */
export function useProgressSummaryPanel(summary: ProgressSummary, peakTier: Tier | null) {
  return {
    lines: progressSummaryLines(summary),
    // Before their first Rank, the Player's badge is the Unranked one, as on their Rank card.
    peakTierBadge: peakTier ?? ("unranked" as const),
    peakTierName: peakTierLine(peakTier),
  };
}
