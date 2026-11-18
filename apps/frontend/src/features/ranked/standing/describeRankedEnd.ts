import type { RankedEnd } from "@repo/duel-engine";
import type { RankChange } from "@repo/ranked-engine";
import { describeStanding } from "./describeStanding.ts";

export type RankedEndSummary = {
  readonly headline: string;
  /** The LP won or lost; `null` while no LP is held, during Placement and on the first Rank. */
  readonly lpChange: string | null;
  readonly detail: string;
};

const CHANGE_LABELS: Readonly<Record<Exclude<RankChange, "none">, string>> = {
  placed: "Placed in",
  promoted: "Promoted to",
  demoted: "Demoted to",
};

const describeLpChange = (lpDelta: number) => {
  if (lpDelta === 0) return "No LP won or lost";
  return `${lpDelta > 0 ? "+" : ""}${lpDelta} LP`;
};

/**
 * The words the end of a ranked Duel is shown in: the Placement progress while Unranked, otherwise
 * the Rank, named with the promotion, demotion or first Rank that led to it, and the LP won or lost.
 */
export function describeRankedEnd({
  lpDelta,
  rankChange,
  rank,
  placement,
}: RankedEnd): RankedEndSummary {
  const { headline, detail } = describeStanding({ rank, placement });
  if (rank === null) return { headline: "Placement", lpChange: null, detail };
  return {
    headline: rankChange === "none" ? headline : `${CHANGE_LABELS[rankChange]} ${headline}`,
    // A first Rank starts at 0 LP: none was won or lost to reach it.
    lpChange: rankChange === "placed" ? null : describeLpChange(lpDelta),
    detail,
  };
}
