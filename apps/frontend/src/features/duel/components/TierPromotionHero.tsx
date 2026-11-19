import type { AvatarPlayer } from "../../../shared/hooks/useAvatar.ts";
import { OrnamentedAvatar } from "../../ornament/components/OrnamentedAvatar.tsx";
import type { TierPromotion } from "../rank/tierPromotion.ts";

interface TierPromotionHeroProps {
  player: AvatarPlayer;
  promotion: TierPromotion;
}

// The canvas draws the Ornament at 5px a pixel; the largest Ornamented Avatar draws it at 3px, so it
// is scaled on the compositor to the same 320 × 380 box.
const CANVAS_SIZE = "scale-[calc(5/3)]";

/** The Participant's Avatar in the Ornament of their old Rank, wiped into the one of their new Rank. */
export function TierPromotionHero({ player, promotion }: TierPromotionHeroProps) {
  return (
    <div className="absolute top-[70px] left-[360px] h-[380px] w-[320px]">
      <div
        aria-hidden="true"
        className="absolute inset-0 grid place-items-center rank-up-silver-old motion-reduce:hidden"
      >
        <OrnamentedAvatar
          player={player}
          ornament={promotion.oldOrnament}
          size="lg"
          isOwn
          className={CANVAS_SIZE}
        />
      </div>
      <div className="absolute inset-0 grid place-items-center rank-up-wipe">
        <OrnamentedAvatar
          player={player}
          ornament={promotion.newOrnament}
          size="lg"
          isOwn
          className={CANVAS_SIZE}
        />
      </div>
      {promotion.tier === "silver" && (
        <div
          aria-hidden="true"
          className="absolute -inset-x-3 top-0 h-2 rounded-xs border-2 border-key-outline bg-ink opacity-0 rank-up-scan motion-reduce:hidden"
        />
      )}
    </div>
  );
}
