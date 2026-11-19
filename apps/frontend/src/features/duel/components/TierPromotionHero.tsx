import type { AvatarPlayer } from "../../../shared/hooks/useAvatar.ts";
import { cn } from "../../../shared/lib/utils.ts";
import { OrnamentedAvatar } from "../../ornament/components/OrnamentedAvatar.tsx";
import type { PromotedTier, TierPromotion } from "../rank/tierPromotion.ts";
import { TierPromotionTiles } from "./TierPromotionTiles.tsx";

interface TierPromotionHeroProps {
  player: AvatarPlayer;
  promotion: TierPromotion;
}

// The canvas draws the Ornament at 5px a pixel; the largest Ornamented Avatar draws it at 3px, so it
// is scaled on the compositor to the same 320 × 380 box.
const CANVAS_SIZE = "scale-[calc(5/3)]";

/** How each Ornament leaves and lands: an outer motion, and an inner one that runs alongside it. */
type HeroMotion = {
  readonly old: string;
  readonly oldInner: string;
  readonly new: string;
  readonly newInner: string;
};

const SILVER: HeroMotion = {
  old: "rank-up-silver-old",
  oldInner: "",
  new: "rank-up-wipe",
  newInner: "",
};

// Master shares Silver's until its own scene lands.
const HERO_MOTIONS: Readonly<Record<PromotedTier, HeroMotion>> = {
  silver: SILVER,
  gold: {
    old: "rank-up-gold-old",
    oldInner: "rank-up-jitter",
    new: "rank-up-flip-in",
    newInner: "rank-up-float",
  },
  platinum: {
    old: "rank-up-platinum-old",
    oldInner: "rank-up-platinum-jitter",
    new: "rank-up-slam",
    newInner: "rank-up-float [--rank-up-float-at:2.6s]",
  },
  // The tiles do the motion; the whole Ornaments only hold until the old shatters and the new is
  // assembled.
  diamond: {
    old: "rank-up-diamond-old",
    oldInner: "rank-up-diamond-jitter",
    new: "rank-up-diamond-new",
    newInner: "rank-up-float [--rank-up-float-at:2.7s]",
  },
  master: SILVER,
};

/** The Participant's Avatar in the Ornament of their old Rank, turned into the one of their new Rank. */
export function TierPromotionHero({ player, promotion }: TierPromotionHeroProps) {
  const motion = HERO_MOTIONS[promotion.tier];

  return (
    <div className="absolute top-[70px] left-[360px] h-[380px] w-[320px] perspective-[1100px]">
      <div aria-hidden="true" className={cn("absolute inset-0 motion-reduce:hidden", motion.old)}>
        <div className={cn("absolute inset-0 grid place-items-center", motion.oldInner)}>
          <OrnamentedAvatar
            player={player}
            ornament={promotion.oldOrnament}
            size="lg"
            isOwn
            className={CANVAS_SIZE}
          />
        </div>
      </div>
      <div className={cn("absolute inset-0", motion.new)}>
        <div className={cn("absolute inset-0 grid place-items-center", motion.newInner)}>
          <OrnamentedAvatar
            player={player}
            ornament={promotion.newOrnament}
            size="lg"
            isOwn
            className={CANVAS_SIZE}
          />
        </div>
      </div>
      {promotion.tier === "diamond" && (
        <TierPromotionTiles
          player={player}
          oldOrnament={promotion.oldOrnament}
          newOrnament={promotion.newOrnament}
          avatarClassName={CANVAS_SIZE}
        />
      )}
      {promotion.tier === "silver" && (
        <div
          aria-hidden="true"
          className="absolute -inset-x-3 top-0 h-2 rounded-xs border-2 border-key-outline bg-ink opacity-0 rank-up-scan motion-reduce:hidden"
        />
      )}
    </div>
  );
}
