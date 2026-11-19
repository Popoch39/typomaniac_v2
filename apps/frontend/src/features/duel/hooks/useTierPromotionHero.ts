import type { TierPromotion } from "../rank/tierPromotion.ts";
import { TIER_SCENES } from "../scene/tierScenes.ts";
import { useDuelParticipants } from "./useDuelParticipants.ts";

/** How the Participant's old Ornament leaves and their new one lands, in their Tier's scene. */
export function useTierPromotionHero({ tier }: TierPromotion) {
  const { self } = useDuelParticipants();
  const { hero, tiling, hasScan } = TIER_SCENES[tier];
  return {
    player: { nickname: self?.name ?? null, avatarUrl: self?.avatarUrl ?? null },
    motion: hero,
    tiling,
    hasScan,
  };
}
