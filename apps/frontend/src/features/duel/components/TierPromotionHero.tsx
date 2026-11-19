import { cn } from "../../../shared/lib/utils.ts";
import { useTierPromotionHero } from "../hooks/useTierPromotionHero.ts";
import type { TierPromotion } from "../rank/tierPromotion.ts";
import { TierPromotionAvatar } from "./TierPromotionAvatar.tsx";
import { TierPromotionTiles } from "./TierPromotionTiles.tsx";

interface TierPromotionHeroProps {
  promotion: TierPromotion;
}

/**
 * The Participant's Avatar in the Ornament of their old Rank, turned into the one of their new Rank:
 * the old Ornament, its tiles, then the new one on top, as the canvas stacks them.
 */
export function TierPromotionHero({ promotion }: TierPromotionHeroProps) {
  const { player, motion, tiling, hasScan } = useTierPromotionHero(promotion);
  const oldAvatar = <TierPromotionAvatar player={player} ornament={promotion.oldOrnament} />;
  const newAvatar = <TierPromotionAvatar player={player} ornament={promotion.newOrnament} />;

  return (
    <div className="absolute top-[70px] left-[360px] h-[380px] w-[320px] perspective-[1100px]">
      <div aria-hidden="true" className={cn("absolute inset-0 motion-reduce:hidden", motion.old)}>
        <div className={cn("absolute inset-0 grid place-items-center", motion.oldInner)}>
          {oldAvatar}
        </div>
      </div>
      {tiling !== null && (
        <TierPromotionTiles
          tiling={tiling}
          floatClassName={motion.newInner}
          oldAvatar={oldAvatar}
          newAvatar={newAvatar}
        />
      )}
      <div className={cn("absolute inset-0", motion.new)}>
        <div className={cn("absolute inset-0 grid place-items-center", motion.newInner)}>
          {newAvatar}
        </div>
      </div>
      {hasScan && (
        <div
          aria-hidden="true"
          className="absolute -inset-x-3 top-0 h-2 rounded-xs border-2 border-key-outline bg-ink opacity-0 rank-up-scan motion-reduce:hidden"
        />
      )}
    </div>
  );
}
