import { DEFAULT_RANKED_CONFIG } from "@repo/ranked-engine";

// The LP of a whole Division, so that a Division's top meets the next one's bottom.
export const DIVISION_SPAN = DEFAULT_RANKED_CONFIG.lpPerDivision;

/**
 * A Rank as one number to plot: the Divisions below it, each worth its LP span, then its LP. Master,
 * one step above Diamond I, climbs on with LP past a Division's span.
 */
export function ladderValue({ ladderIndex, lp }: { ladderIndex: number; lp: number }) {
  return ladderIndex * DIVISION_SPAN + lp;
}
