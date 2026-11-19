import type { CSSProperties } from "react";
import { DIAMOND_ASSEMBLE_AT, DIAMOND_SHATTER_AT, DIAMOND_TILES } from "../scene/diamondTiles.ts";

type CustomStyle = CSSProperties & Record<`--${string}`, string>;

const tileStyles = (at: number): CustomStyle[] =>
  DIAMOND_TILES.map(({ clipPath, x, y, rotate, delay }) => ({
    clipPath,
    animationDelay: `${at + delay}s`,
    "--tile-x": `${x}px`,
    "--tile-y": `${y}px`,
    "--tile-rotate": `${rotate}deg`,
  }));

/** The tiles the old Ornament shatters into, and the ones the new Ornament assembles from. */
export function useTierPromotionTiles() {
  return {
    oldTileStyles: tileStyles(DIAMOND_SHATTER_AT),
    newTileStyles: tileStyles(DIAMOND_ASSEMBLE_AT),
  };
}
