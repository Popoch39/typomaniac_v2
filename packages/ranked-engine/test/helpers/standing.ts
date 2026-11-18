import type { Rank, Standing } from "../../src/index.ts";

/** A standing past Placement, so K is the regular K-factor, 32. */
export function ranked(mmr: number, rank: Rank): Standing {
  return { mmr, duelsPlayed: 20, rank };
}
