import { cn } from "../../../shared/lib/utils.ts";
import { useTierPromotionRings } from "../hooks/useTierPromotionRings.ts";
import type { PromotedTier } from "../rank/tierPromotion.ts";

interface TierPromotionRingsProps {
  tier: PromotedTier;
}

// Centred on the Ornament, at (520, 260) of the stage.
const RING =
  "absolute top-[260px] left-[520px] -mt-[110px] -ml-[110px] size-[220px] rounded-[20px] border-(--rank-up-tier) opacity-0";

/** The rings closing on the old Ornament, under the rings thrown out of the new one. */
export function TierPromotionRings({ tier }: TierPromotionRingsProps) {
  const { inwardRingStyles, ringStyles } = useTierPromotionRings(tier);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 motion-reduce:hidden">
      {inwardRingStyles.map((style, index) => (
        <span
          key={index}
          className={cn(RING, "border-4 shadow-[0_0_0_3px_var(--key-outline)] rank-up-inward-ring")}
          style={style}
        />
      ))}
      {ringStyles.map((style, index) => (
        <span
          key={index}
          className={cn(
            RING,
            "border-5 shadow-[0_0_0_3px_var(--key-outline),inset_0_0_0_3px_var(--key-outline)] rank-up-ring",
          )}
          style={style}
        />
      ))}
    </div>
  );
}
