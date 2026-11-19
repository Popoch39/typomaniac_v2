import type { CSSProperties } from "react";
import {
  DIAMOND_ASSEMBLE_AT,
  DIAMOND_SHATTER_AT,
  DIAMOND_TILES,
  type Tile,
} from "../scene/diamondTiles.ts";
import { MASTER_ASSEMBLE_AT, MASTER_SHATTER_AT, MASTER_TILES } from "../scene/masterTiles.ts";

type CustomStyle = CSSProperties & Record<`--${string}`, string>;

/** The Tiers whose scene shatters the old Ornament into tiles and assembles the new one from them. */
export type ShatteredTier = "diamond" | "master";

type Tiling = {
  readonly tiles: readonly Tile[];
  readonly shatterAt: number;
  readonly assembleAt: number;
  /** When the assembled Ornament starts to float, with the whole new one. */
  readonly floatClassName: string;
};

const TILINGS: Readonly<Record<ShatteredTier, Tiling>> = {
  diamond: {
    tiles: DIAMOND_TILES,
    shatterAt: DIAMOND_SHATTER_AT,
    assembleAt: DIAMOND_ASSEMBLE_AT,
    floatClassName: "[--rank-up-float-at:2.7s]",
  },
  master: {
    tiles: MASTER_TILES,
    shatterAt: MASTER_SHATTER_AT,
    assembleAt: MASTER_ASSEMBLE_AT,
    floatClassName: "[--rank-up-float-at:2.9s]",
  },
};

const tileStyles = (tiles: readonly Tile[], at: number): CustomStyle[] =>
  tiles.map(({ clipPath, x, y, rotate, delay }) => ({
    clipPath,
    animationDelay: `${at + delay}s`,
    "--tile-x": `${x}px`,
    "--tile-y": `${y}px`,
    "--tile-rotate": `${rotate}deg`,
  }));

/** The tiles the old Ornament shatters into, and the ones the new Ornament assembles from. */
export function useTierPromotionTiles(tier: ShatteredTier) {
  const { tiles, shatterAt, assembleAt, floatClassName } = TILINGS[tier];
  return {
    oldTileStyles: tileStyles(tiles, shatterAt),
    newTileStyles: tileStyles(tiles, assembleAt),
    floatClassName,
  };
}
