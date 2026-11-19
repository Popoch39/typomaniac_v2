import { cn } from "../../../shared/lib/utils.ts";
import { useTierPromotionEffects } from "../hooks/useTierPromotionEffects.ts";
import type { PromotedTier } from "../rank/tierPromotion.ts";
import { TierPromotionGrid } from "./TierPromotionGrid.tsx";
import { TierPromotionRain } from "./TierPromotionRain.tsx";
import { TierPromotionRays } from "./TierPromotionRays.tsx";
import { TierPromotionStars } from "./TierPromotionStars.tsx";

interface TierPromotionEffectsProps {
  tier: PromotedTier;
}

// Centred on the Ornament, at (520, 260) of the stage; the rain, the grid, the rays and the stars sit
// behind the rings.
export function TierPromotionEffects({ tier }: TierPromotionEffectsProps) {
  const effects = useTierPromotionEffects(tier);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 motion-reduce:hidden">
      <TierPromotionRain drops={effects.rain} />
      <TierPromotionGrid squareStyles={effects.gridSquareStyles} />
      {effects.rays !== null && <TierPromotionRays {...effects.rays} />}
      <TierPromotionStars starStyles={effects.starStyles} />
      {effects.inwardRingStyles.map((style, index) => (
        <span
          key={index}
          className="absolute top-[260px] left-[520px] -mt-[110px] -ml-[110px] size-[220px] rounded-[20px] border-4 border-(--rank-up-tier) opacity-0 shadow-[0_0_0_3px_var(--key-outline)] rank-up-inward-ring"
          style={style}
        />
      ))}
      {effects.ringStyles.map((style, index) => (
        <span
          key={index}
          className="absolute top-[260px] left-[520px] -mt-[110px] -ml-[110px] size-[220px] rounded-[20px] border-5 border-(--rank-up-tier) opacity-0 shadow-[0_0_0_3px_var(--key-outline),inset_0_0_0_3px_var(--key-outline)] rank-up-ring"
          style={style}
        />
      ))}
      {effects.bursts.map(({ fillClassName, style }, index) => (
        <span
          key={index}
          className={cn(
            "absolute top-[260px] left-[520px] border-2 border-key-outline opacity-0 rank-up-burst",
            fillClassName,
          )}
          style={style}
        />
      ))}
    </div>
  );
}
