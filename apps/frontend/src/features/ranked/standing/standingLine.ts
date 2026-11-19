import type { VisibleStanding } from "./describeStanding.ts";
import { rankName } from "./rankName.ts";

/** A Standing on one short line, under a Nickname: the Rank and its LP, or the Placement progress. */
export function standingLine({ rank, placement }: VisibleStanding) {
  if (rank === null) return `Placement ${placement.played}/${placement.total}`;
  return `${rankName(rank)} · ${rank.lp} LP`;
}
