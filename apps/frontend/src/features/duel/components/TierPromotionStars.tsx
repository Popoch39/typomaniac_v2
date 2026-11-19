import type { CSSProperties } from "react";

interface TierPromotionStarsProps {
  starStyles: readonly CSSProperties[];
}

/** Pixel stars of the ink, a cross of five pixels, blinking for as long as the scene stays open. */
export function TierPromotionStars({ starStyles }: TierPromotionStarsProps) {
  return starStyles.map((style, index) => (
    <span
      key={index}
      className="absolute size-2 bg-ink opacity-0 shadow-[8px_0_0_var(--ink),-8px_0_0_var(--ink),0_8px_0_var(--ink),0_-8px_0_var(--ink)] rank-up-star"
      style={style}
    />
  ));
}
