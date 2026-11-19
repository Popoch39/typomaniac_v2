import type { RankedEnd } from "@repo/duel-engine";
import { DEFAULT_RANKED_CONFIG, type Rank, type RankChange, type Tier } from "@repo/ranked-engine";
import { describeRankedEnd } from "../../ranked/standing/describeRankedEnd.ts";
import { nextRankName } from "../../ranked/standing/nextRankName.ts";

export type LpTone = "gain" | "loss" | "none";

const describeLpDelta = (lpDelta: number): { amount: string; tone: LpTone } => {
  if (lpDelta > 0) return { amount: `+${lpDelta}`, tone: "gain" };
  if (lpDelta < 0) return { amount: String(lpDelta), tone: "loss" };
  return { amount: "±0", tone: "none" };
};

export type RankedEndBlock = {
  readonly lpDelta: { readonly amount: string; readonly tone: LpTone } | null;
  /** `unranked` during Placement, when no Rank is held yet. */
  readonly tier: Tier | "unranked";
  readonly standing: string;
  readonly isAnnounced: boolean;
  /** `from` is the LP the bar sweeps from to `lp`, on the scale of the Division now held. */
  readonly progress: { readonly lp: number; readonly from: number; readonly next: string } | null;
  readonly placement: string | null;
};

/**
 * The LP held before the Duel, on the scale of the Division held after it: a promotion climbs the
 * new Division from empty, a demotion falls into the one below from full.
 */
const lpBefore = (rank: Rank, lpDelta: number, rankChange: RankChange): number => {
  if (rankChange === "promoted") return 0;
  if (rankChange === "demoted") return DEFAULT_RANKED_CONFIG.lpPerDivision;
  return rank.lp - lpDelta;
};

/**
 * What the end of a ranked Duel shows of the Participant's own Standing, in the words of the
 * ranked end description: the LP won or lost, the Rank reached and the climb toward the next one.
 */
export function rankedEndBlock(ranked: RankedEnd): RankedEndBlock {
  const { headline, lpChange, detail } = describeRankedEnd(ranked);
  const { lpDelta, rankChange, rank } = ranked;
  // While Unranked, the detail is the Placement progress, shown in place of the LP bar.
  if (rank === null) {
    return {
      lpDelta: null,
      tier: "unranked",
      standing: headline,
      isAnnounced: false,
      progress: null,
      placement: detail,
    };
  }
  const next = nextRankName(rank);
  return {
    lpDelta: lpChange === null ? null : describeLpDelta(lpDelta),
    tier: rank.tier,
    standing: `${headline} · ${detail}`,
    isAnnounced: rankChange !== "none",
    progress:
      next === null ? null : { lp: rank.lp, from: lpBefore(rank, lpDelta, rankChange), next },
    placement: null,
  };
}
