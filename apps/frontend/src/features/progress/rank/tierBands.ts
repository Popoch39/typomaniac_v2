import { ladderIndex, TIERS, type Tier } from "@repo/ranked-engine";
import { DIVISION_SPAN, ladderValue } from "./ladderValue.ts";

export interface TierBand {
  tier: Tier;
  from: number;
  to: number;
}

// Where each Tier starts on the ladder: its lowest Division at 0 LP, Master having none.
const TIER_STARTS = TIERS.map((tier) => ({
  tier,
  start: ladderValue({
    ladderIndex: ladderIndex(tier === "master" ? { tier, lp: 0 } : { tier, division: 4, lp: 0 }),
    lp: 0,
  }),
}));

/**
 * The ladder values a Rank chart shows: from the bottom of the lowest Division reached to the top of
 * the highest, whole Divisions so that a Division's band is never cut. Takes at least one value.
 */
export function ladderDomain(values: readonly number[]): [number, number] {
  const bottom = (value: number) => Math.floor(value / DIVISION_SPAN) * DIVISION_SPAN;
  return [bottom(Math.min(...values)), bottom(Math.max(...values)) + DIVISION_SPAN];
}

/** The part of each Tier the ladder shown covers, from the lowest Tier up; Master runs to its top. */
export function tierBands([low, high]: readonly [number, number]): TierBand[] {
  return TIER_STARTS.flatMap(({ tier, start }, index) => {
    const end = TIER_STARTS[index + 1]?.start ?? Infinity;
    const from = Math.max(low, start);
    const to = Math.min(high, end);
    return from < to ? [{ tier, from, to }] : [];
  });
}
