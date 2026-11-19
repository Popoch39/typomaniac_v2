import { ladderIndex, type Rank, rankAtLadderIndex } from "@repo/ranked-engine";
import { rankName } from "./rankName.ts";

/** The name of the Rank 100 LP promote to: the next Division, or Master above Diamond I; `null` in Master. */
export function nextRankName(rank: Rank) {
  if (rank.tier === "master") return null;
  return rankName(rankAtLadderIndex(ladderIndex(rank) + 1, 0));
}
