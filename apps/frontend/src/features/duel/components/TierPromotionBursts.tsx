import { cn } from "../../../shared/lib/utils.ts";
import { useTierPromotionBursts } from "../hooks/useTierPromotionBursts.ts";
import type { PromotedTier } from "../rank/tierPromotion.ts";

interface TierPromotionBurstsProps {
  tier: PromotedTier;
}

/** The particles thrown out of the Ornament, from its centre at (520, 260) of the stage. */
export function TierPromotionBursts({ tier }: TierPromotionBurstsProps) {
  const bursts = useTierPromotionBursts(tier);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 motion-reduce:hidden">
      {bursts.map(({ fillClassName, style }, index) => (
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
