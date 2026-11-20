import type { Tier } from "@repo/ranked-engine";
import { peakTierLine } from "../summary/progressSummary.ts";

/** The Player's Peak Tier, of all time, as a badge and a name. */
export function usePeakTierTile(peakTier: Tier | null) {
  return {
    // Before their first Rank, the Player's badge is the Unranked one, as on their Rank card.
    badge: peakTier ?? ("unranked" as const),
    name: peakTierLine(peakTier),
  };
}
