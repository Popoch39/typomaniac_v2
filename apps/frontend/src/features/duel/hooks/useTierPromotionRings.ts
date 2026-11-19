import type { CSSProperties } from "react";
import type { PromotedTier } from "../rank/tierPromotion.ts";
import { TIER_SCENES } from "../scene/tierScenes.ts";

/** The rings a Tier's scene closes on the old Ornament, and the ones it throws out of the new. */
export function useTierPromotionRings(tier: PromotedTier) {
  const { at, rings, inwardRings } = TIER_SCENES[tier].effects;
  return {
    inwardRingStyles: (inwardRings ?? []).map((delay): CSSProperties => ({
      animationDelay: `${delay}s`,
    })),
    ringStyles: rings.map((delay): CSSProperties => ({ animationDelay: `${at + delay}s` })),
  };
}
