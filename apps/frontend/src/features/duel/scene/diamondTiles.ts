import { cutIntoTiles, type TileScatter } from "./cutIntoTiles.ts";

/** When the old Ornament shatters, and when the new one starts to assemble, in seconds. */
export const DIAMOND_SHATTER_AT = 1.2;
export const DIAMOND_ASSEMBLE_AT = 1.3;

/** Row by row, the scatter of each tile as placed on the canvas. */
const SCATTER: readonly TileScatter[] = [
  { x: -330, y: -333, rotate: -14, delay: 0.09 },
  { x: -54, y: -466, rotate: 27, delay: 0.01 },
  { x: 322, y: -222, rotate: 19, delay: 0.01 },
  { x: -458, y: -127, rotate: 2, delay: 0.08 },
  { x: -186, y: 416, rotate: -7, delay: 0.02 },
  { x: 337, y: 45, rotate: -29, delay: 0.04 },
  { x: -296, y: 307, rotate: -31, delay: 0.06 },
  { x: -48, y: 331, rotate: 1, delay: 0 },
  { x: 201, y: 233, rotate: -14, delay: 0.08 },
];

/** The nine tiles the Diamond scene cuts the Ornament into. */
export const DIAMOND_TILES = cutIntoTiles(SCATTER);
