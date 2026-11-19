/** When the old Ornament shatters, and when the new one starts to assemble, in seconds. */
export const DIAMOND_SHATTER_AT = 1.2;
export const DIAMOND_ASSEMBLE_AT = 1.3;

const SIDE = 3;

export type Tile = {
  /** The part of the Ornament the tile shows, as a CSS `clip-path`. */
  readonly clipPath: string;
  /** Where the tile flies to as it shatters, and comes from as it assembles, in px. */
  readonly x: number;
  readonly y: number;
  /** In degrees. */
  readonly rotate: number;
  /** After the shatter or the assembly starts, in seconds. */
  readonly delay: number;
};

/** Row by row, the scatter of each tile as placed on the canvas. */
const SCATTER: readonly Omit<Tile, "clipPath">[] = [
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

// Thirds rounded to two decimals, as the canvas writes them.
const third = (count: number) => `${Number(((count * 100) / SIDE).toFixed(2))}%`;

/** The nine tiles the Diamond scene cuts the Ornament into, a 3 by 3 grid. */
export const DIAMOND_TILES: readonly Tile[] = SCATTER.map((scatter, index) => {
  const row = Math.floor(index / SIDE);
  const column = index % SIDE;
  const clipPath = `inset(${third(row)} ${third(SIDE - 1 - column)} ${third(SIDE - 1 - row)} ${third(column)})`;
  return { clipPath, ...scatter };
});
