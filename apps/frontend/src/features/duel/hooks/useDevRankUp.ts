import type { Rank } from "@repo/ranked-engine";
import { tierName } from "../../ranked/standing/rankName.ts";
import type { PromotedTier } from "../rank/tierPromotion.ts";
import { useTierPromotionStore } from "../store/useTierPromotionStore.ts";

// The Rank each Tier promotion lands on: Division IV of the Tier reached, or Master.
const PROMOTED_RANKS: Record<PromotedTier, Rank> = {
  silver: { tier: "silver", division: 4, lp: 0 },
  gold: { tier: "gold", division: 4, lp: 0 },
  platinum: { tier: "platinum", division: 4, lp: 0 },
  diamond: { tier: "diamond", division: 4, lp: 0 },
  master: { tier: "master", lp: 0 },
};

/** Plays the Rank up scene of any Tier promotion, outside a Duel, to check its animations. */
export function useDevRankUp() {
  const reset = useTierPromotionStore((s) => s.reset);
  const end = useTierPromotionStore((s) => s.end);
  return {
    scenes: Object.entries(PROMOTED_RANKS).map(([tier, rank]) => ({
      tier,
      label: tierName(rank.tier),
      // The scene plays once per Duel, so each replay starts as a new one.
      onPlay: () => {
        reset();
        end({ lpDelta: 20, rankChange: "promoted", rank, placement: { played: 5, total: 5 } });
      },
    })),
  };
}
