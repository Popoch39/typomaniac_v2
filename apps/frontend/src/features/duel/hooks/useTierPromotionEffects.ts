import type { CSSProperties } from "react";
import type { PromotedTier } from "../rank/tierPromotion.ts";
import { type BurstFill, SILVER_BURST_AT, SILVER_BURSTS } from "../scene/silverBursts.ts";

type BurstStyle = CSSProperties & Record<`--${string}`, string>;

const BURST_FILLS: Readonly<Record<BurstFill, string>> = {
  tier: "bg-(--rank-up-tier)",
  ink: "bg-ink",
  action: "bg-action",
};

/** The ring and the burst particles a Tier's scene throws out of the Ornament; none yet above Silver. */
export function useTierPromotionEffects(tier: PromotedTier) {
  if (tier !== "silver") return null;
  return {
    ringStyle: { animationDelay: `${SILVER_BURST_AT}s` },
    bursts: SILVER_BURSTS.map(({ x, y, delay, duration, size, fill }) => {
      const style: BurstStyle = {
        width: `${size}px`,
        height: `${size}px`,
        "--burst-x": `${x}px`,
        "--burst-y": `${y}px`,
        "--burst-delay": `${SILVER_BURST_AT + delay}s`,
        "--burst-duration": `${duration}s`,
      };
      return { fillClassName: BURST_FILLS[fill], style };
    }),
  };
}
