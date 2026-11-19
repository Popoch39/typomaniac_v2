import type { Rank } from "@repo/ranked-engine";
import { nextRankName } from "../standing/nextRankName.ts";
import { rankName } from "../standing/rankName.ts";

export function useRankSummary(rank: Rank) {
  return { name: rankName(rank), next: nextRankName(rank) };
}
