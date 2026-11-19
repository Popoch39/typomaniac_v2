import type { ReactNode } from "react";
import { cn } from "../../../shared/lib/utils.ts";
import { useTierPromotionTiles } from "../hooks/useTierPromotionTiles.ts";
import type { Tiling } from "../scene/tierScenes.ts";

interface TierPromotionTilesProps {
  tiling: Tiling;
  /** The float of the new Ornament, which its tiles share. */
  floatClassName: string;
  oldAvatar: ReactNode;
  newAvatar: ReactNode;
}

/**
 * The old Ornament shattering into tiles, and the new one assembling from tiles; each tile is a
 * clipped copy of the whole Ornamented Avatar. The new tiles float with the new Ornament they cover.
 */
export function TierPromotionTiles({
  tiling,
  floatClassName,
  oldAvatar,
  newAvatar,
}: TierPromotionTilesProps) {
  const { oldTileStyles, newTileStyles } = useTierPromotionTiles(tiling);

  return (
    <div aria-hidden="true" className="absolute inset-0 motion-reduce:hidden">
      {oldTileStyles.map((style, index) => (
        <div
          key={index}
          className="absolute inset-0 grid place-items-center opacity-0 rank-up-shatter"
          style={style}
        >
          {oldAvatar}
        </div>
      ))}
      <div className={cn("absolute inset-0", floatClassName)}>
        {newTileStyles.map((style, index) => (
          <div
            key={index}
            className="absolute inset-0 grid place-items-center rank-up-assemble"
            style={style}
          >
            {newAvatar}
          </div>
        ))}
      </div>
    </div>
  );
}
