import { cutIntoTiles } from "./diamondTiles.ts";

/** When the old Ornament shatters, and when the new one starts to assemble, in seconds. */
export const MASTER_SHATTER_AT = 1.3;
export const MASTER_ASSEMBLE_AT = 1.45;

/** The nine tiles the Master scene cuts the Ornament into, with the scatter the canvas gives them. */
export const MASTER_TILES = cutIntoTiles([
  { x: -258, y: -259, rotate: 14, delay: 0 },
  { x: -80, y: -254, rotate: -1, delay: 0.09 },
  { x: 249, y: -224, rotate: -19, delay: 0.07 },
  { x: -288, y: -50, rotate: 21, delay: 0.05 },
  { x: -25, y: 317, rotate: -22, delay: 0.06 },
  { x: 436, y: 13, rotate: 35, delay: 0.01 },
  { x: -223, y: 253, rotate: 16, delay: 0.1 },
  { x: 49, y: 341, rotate: -8, delay: 0.07 },
  { x: 197, y: 280, rotate: -5, delay: 0.04 },
]);
