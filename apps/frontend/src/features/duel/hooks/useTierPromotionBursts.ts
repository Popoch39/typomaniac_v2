import type { CustomPropertyStyle } from "../../../shared/lib/customPropertyStyle.ts";
import type { PromotedTier } from "../rank/tierPromotion.ts";
import { BURST_FILL_CLASS_NAMES } from "../scene/burstFills.ts";
import { TIER_SCENES } from "../scene/tierScenes.ts";

/** The particles a Tier's scene throws out of the Ornament as it lands. */
export function useTierPromotionBursts(tier: PromotedTier) {
  const { at, bursts } = TIER_SCENES[tier].effects;
  return bursts.map(({ x, y, delay, duration, size, fill }) => {
    const style: CustomPropertyStyle = {
      width: `${size}px`,
      height: `${size}px`,
      "--burst-x": `${x}px`,
      "--burst-y": `${y}px`,
      "--burst-delay": `${at + delay}s`,
      "--burst-duration": `${duration}s`,
    };
    return { fillClassName: BURST_FILL_CLASS_NAMES[fill], style };
  });
}
