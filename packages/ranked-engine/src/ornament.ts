import { rankAtLadderIndex } from "./ladder.ts";
import { isTierChoice, TIERS } from "./tier.ts";
import type { Division, Rank, Tier } from "./types.ts";

/** What a Player chose to wear: their Rank's Ornament, none, the Unranked plate, or a pinned Tier. */
export type OrnamentChoice = "auto" | "none" | "unranked" | Tier;

/** The Ornament a Player wears, `null` for a bare Avatar. */
export type Ornament = { tier: Tier | "unranked"; division: Division | null } | null;

/** ORNAMENT-1: Auto follows the Rank, Division included; a pinned Tier shows the Division only when it is the Rank's. */
export function wornOrnament(choice: OrnamentChoice, rank: Rank | null): Ornament {
  if (choice === "none") return null;
  if (choice === "unranked") return { tier: "unranked", division: null };
  if (choice !== "auto" && choice !== rank?.tier) return { tier: choice, division: null };
  if (rank === null) return { tier: "unranked", division: null };
  return { tier: rank.tier, division: rank.tier === "master" ? null : rank.division };
}

/** ORNAMENT-2: a Tier's Ornament is unlocked once the Peak Tier reaches it; the other choices always are. */
export function isOrnamentUnlocked(choice: OrnamentChoice, peakTier: Tier | null): boolean {
  if (!isTierChoice(choice)) return true;
  return peakTier !== null && TIERS.indexOf(choice) <= TIERS.indexOf(peakTier);
}

/** ORNAMENT-3: the Tier a ladder index stands in, which gives the Peak Tier from the highest index reached. */
export function tierAtLadderIndex(index: number): Tier {
  return rankAtLadderIndex(index, 0).tier;
}
