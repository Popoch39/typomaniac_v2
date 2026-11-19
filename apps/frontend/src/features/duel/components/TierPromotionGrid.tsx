import type { CSSProperties } from "react";

interface TierPromotionGridProps {
  squareStyles: readonly CSSProperties[];
}

/** Squares of the Tier colour over the whole stage, blinking out from the Ornament. */
export function TierPromotionGrid({ squareStyles }: TierPromotionGridProps) {
  return squareStyles.map((style, index) => (
    <span
      key={index}
      className="absolute size-8 rounded-sm border-2 border-key-outline bg-(--rank-up-tier) opacity-0 rank-up-blink"
      style={style}
    />
  ));
}
