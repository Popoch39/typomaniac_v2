import type { PromotedTier } from "../rank/tierPromotion.ts";
import { useTierPromotionBackdrop } from "../hooks/useTierPromotionBackdrop.ts";
import { TierPromotionGrid } from "./TierPromotionGrid.tsx";
import { TierPromotionRain } from "./TierPromotionRain.tsx";
import { TierPromotionRays } from "./TierPromotionRays.tsx";
import { TierPromotionStars } from "./TierPromotionStars.tsx";

interface TierPromotionBackdropProps {
  tier: PromotedTier;
}

/** The grid, the rain, the rays and the stars, stacked in that order at the back of the scene. */
export function TierPromotionBackdrop({ tier }: TierPromotionBackdropProps) {
  const { gridSquareStyles, rain, rays, starStyles } = useTierPromotionBackdrop(tier);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 motion-reduce:hidden">
      <TierPromotionGrid squareStyles={gridSquareStyles} />
      <TierPromotionRain drops={rain} />
      {rays !== null && <TierPromotionRays {...rays} />}
      <TierPromotionStars starStyles={starStyles} />
    </div>
  );
}
