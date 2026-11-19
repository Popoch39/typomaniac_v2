import type { Tier } from "./types.ts";

/** The six Tiers, from the lowest to the highest. */
export const TIERS: readonly Tier[] = ["bronze", "silver", "gold", "platinum", "diamond", "master"];

/** Whether a value, such as an Ornament choice or a field read from JSON, names a Tier. */
export function isTierChoice(value: unknown): value is Tier {
  return TIERS.some((tier) => tier === value);
}
