const SIDE = 3;

export type TileScatter = Omit<Tile, "clipPath">;

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

// Thirds rounded to two decimals, as the canvas writes them.
const third = (count: number) => `${Number(((count * 100) / SIDE).toFixed(2))}%`;

/** Cuts the Ornament into a 3 by 3 grid of tiles, row by row, each with its scatter. */
export const cutIntoTiles = (scatter: readonly TileScatter[]): readonly Tile[] =>
  scatter.map((tileScatter, index) => {
    const row = Math.floor(index / SIDE);
    const column = index % SIDE;
    const clipPath = `inset(${third(row)} ${third(SIDE - 1 - column)} ${third(SIDE - 1 - row)} ${third(column)})`;
    return { clipPath, ...tileScatter };
  });
