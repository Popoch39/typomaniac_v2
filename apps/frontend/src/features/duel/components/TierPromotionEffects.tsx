import { cn } from "../../../shared/lib/utils.ts";
import { useTierPromotionEffects } from "../hooks/useTierPromotionEffects.ts";
import type { PromotedTier } from "../rank/tierPromotion.ts";

interface TierPromotionEffectsProps {
  tier: PromotedTier;
}

// Centred on the Ornament, at (520, 260) of the stage.
export function TierPromotionEffects({ tier }: TierPromotionEffectsProps) {
  const effects = useTierPromotionEffects(tier);
  if (effects === null) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 motion-reduce:hidden">
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
