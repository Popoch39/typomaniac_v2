import type { Ornament } from "@repo/ranked-engine";
import type { AvatarPlayer } from "../../../shared/hooks/useAvatar.ts";
import { OrnamentedAvatar } from "../../ornament/components/OrnamentedAvatar.tsx";
import { cn } from "../../../shared/lib/utils.ts";
import { type ShatteredTier, useTierPromotionTiles } from "../hooks/useTierPromotionTiles.ts";

interface TierPromotionTilesProps {
  tier: ShatteredTier;
  player: AvatarPlayer;
  oldOrnament: NonNullable<Ornament>;
  newOrnament: NonNullable<Ornament>;
  /** Scales the Ornament to the box of the hero, as the hero does. */
  avatarClassName: string;
}

/**
 * The old Ornament shattering into tiles, and the new one assembling from tiles; each tile is a
 * clipped copy of the whole Ornamented Avatar. The new tiles float with the new Ornament they cover.
 */
export function TierPromotionTiles({
  tier,
  player,
  oldOrnament,
  newOrnament,
  avatarClassName,
}: TierPromotionTilesProps) {
  const { oldTileStyles, newTileStyles, floatClassName } = useTierPromotionTiles(tier);

  return (
    <div aria-hidden="true" className="absolute inset-0 motion-reduce:hidden">
      {oldTileStyles.map((style, index) => (
        <div
          key={index}
          className="absolute inset-0 grid place-items-center opacity-0 rank-up-shatter"
          style={style}
        >
          <OrnamentedAvatar
            player={player}
            ornament={oldOrnament}
            size="lg"
            isOwn
            className={avatarClassName}
          />
        </div>
      ))}
      <div className={cn("absolute inset-0 rank-up-float", floatClassName)}>
        {newTileStyles.map((style, index) => (
          <div
            key={index}
            className="absolute inset-0 grid place-items-center rank-up-assemble"
            style={style}
          >
            <OrnamentedAvatar
              player={player}
              ornament={newOrnament}
              size="lg"
              isOwn
              className={avatarClassName}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
