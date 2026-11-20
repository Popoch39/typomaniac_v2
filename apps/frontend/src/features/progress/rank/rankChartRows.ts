import { type RankChange, rankAtLadderIndex } from "@repo/ranked-engine";
import { rankName } from "../../ranked/standing/rankName.ts";
import { ladderValue } from "./ladderValue.ts";

export interface RankPoint {
  /** The end of the ranked Duel, in milliseconds since the epoch. */
  endedAt: number;
  ladderIndex: number;
  lp: number;
  rankChange: RankChange;
}

const CHANGE_LEADS: Record<RankChange, string> = {
  placed: "Placed in ",
  promoted: "Promoted to ",
  demoted: "Demoted to ",
  none: "",
};

/** One point per ranked Duel, oldest first, numbered from 1, at its Rank's value on the ladder. */
export function rankChartRows(points: readonly RankPoint[]) {
  return points.map(({ endedAt, ladderIndex, lp, rankChange }, index) => ({
    duel: index + 1,
    endedAt,
    ladder: ladderValue({ ladderIndex, lp }),
    rankChange,
    line: `${CHANGE_LEADS[rankChange]}${rankName(rankAtLadderIndex(ladderIndex, lp))}, ${lp} LP`,
  }));
}
