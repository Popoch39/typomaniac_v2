import { DEFAULT_RANKED_CONFIG, type RankedConfig } from "./config.ts";
import { ladderIndex, rankAtLadderIndex } from "./ladder.ts";
import type { Standing } from "./types.ts";

/** A signed amount of MMR and LP to give a Player back or take from them, outside any Duel. */
export type Correction = { mmr: number; lp: number };

const MASTER_INDEX = ladderIndex({ tier: "master", lp: 0 });

/**
 * CORRECT-1 to CORRECT-4: the Standing moved by a correction. The LP are counted along the whole
 * ladder, so a correction crosses as many Divisions and Tiers as its LP require, either way, with
 * no demotion landing: what is taken back is exactly what is given back.
 */
export function applyCorrection(
  standing: Standing,
  correction: Correction,
  config: RankedConfig = DEFAULT_RANKED_CONFIG,
): Standing {
  // As after a Duel (MMR-2, PROMO-4): no MMR below 0, no Rank below Bronze IV at 0 LP.
  const mmr = Math.max(0, standing.mmr + correction.mmr);
  if (standing.rank === null) return { ...standing, mmr };
  const position = ladderIndex(standing.rank) * config.lpPerDivision + standing.rank.lp;
  const corrected = Math.max(0, position + correction.lp);
  const index = Math.min(Math.floor(corrected / config.lpPerDivision), MASTER_INDEX);
  return {
    ...standing,
    mmr,
    rank: rankAtLadderIndex(index, corrected - index * config.lpPerDivision),
  };
}
