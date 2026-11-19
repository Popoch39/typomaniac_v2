import type { Rank, Tier } from "@repo/ranked-engine";
import { divisionNumeral, tierName } from "../standing/rankName.ts";

const TIERS: readonly Tier[] = ["bronze", "silver", "gold", "platinum", "diamond", "master"];

/** The six Tiers, the Player's own marked with their Division; none while they are Unranked. */
export function useTierLadder(rank: Rank | null) {
  return TIERS.map((tier) => {
    const isCurrent = rank?.tier === tier;
    const divisions = tier === "master" ? "No Division" : "IV – I";
    const own =
      rank === null || rank.tier === "master" ? "You" : `You: ${divisionNumeral(rank.division)}`;
    return { tier, name: tierName(tier), isCurrent, line: isCurrent ? own : divisions };
  });
}
