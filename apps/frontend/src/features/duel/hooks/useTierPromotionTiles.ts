import type { CustomPropertyStyle } from "../../../shared/lib/customPropertyStyle.ts";
import type { Tile } from "../scene/cutIntoTiles.ts";
import type { Tiling } from "../scene/tierScenes.ts";

const tileStyles = (tiles: readonly Tile[], at: number): CustomPropertyStyle[] =>
  tiles.map(({ clipPath, x, y, rotate, delay }) => ({
    clipPath,
    animationDelay: `${at + delay}s`,
    "--tile-x": `${x}px`,
    "--tile-y": `${y}px`,
    "--tile-rotate": `${rotate}deg`,
  }));

/** The tiles the old Ornament shatters into, and the ones the new Ornament assembles from. */
export function useTierPromotionTiles({ tiles, shatterAt, assembleAt }: Tiling) {
  return {
    oldTileStyles: tileStyles(tiles, shatterAt),
    newTileStyles: tileStyles(tiles, assembleAt),
  };
}
