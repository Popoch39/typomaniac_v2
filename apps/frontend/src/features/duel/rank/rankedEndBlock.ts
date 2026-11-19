import type { RankedEnd } from "@repo/duel-engine";
import { describeRankedEnd } from "../../ranked/standing/describeRankedEnd.ts";
import { nextRankName } from "../../ranked/standing/nextRankName.ts";

export type LpTone = "gain" | "loss" | "none";

const describeLpDelta = (lpDelta: number): { amount: string; tone: LpTone } => {
  if (lpDelta > 0) return { amount: `+${lpDelta}`, tone: "gain" };
  if (lpDelta < 0) return { amount: String(lpDelta), tone: "loss" };
  return { amount: "±0", tone: "none" };
};

/**
 * What the end of a ranked Duel shows of the Participant's own Standing, in the words of the
 * ranked end description: the LP won or lost, the Rank reached and the climb toward the next one.
 */
export function rankedEndBlock(ranked: RankedEnd) {
  const { headline, lpChange, detail } = describeRankedEnd(ranked);
  const { lpDelta, rankChange, rank } = ranked;
  // While Unranked, the detail is the Placement progress, shown in place of the LP bar.
  if (rank === null) {
    return {
      lpDelta: null,
      standing: headline,
      isAnnounced: false,
      progress: null,
      placement: detail,
    };
  }
  const next = nextRankName(rank);
  return {
    lpDelta: lpChange === null ? null : describeLpDelta(lpDelta),
    standing: `${headline} · ${detail}`,
    isAnnounced: rankChange !== "none",
    progress: next === null ? null : { lp: rank.lp, next },
    placement: null,
  };
}
