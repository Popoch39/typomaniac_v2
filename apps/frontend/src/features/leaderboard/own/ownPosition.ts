import type { Rank } from "@repo/ranked-engine";
import { nextRankName } from "../../ranked/standing/nextRankName.ts";
import { rankName } from "../../ranked/standing/rankName.ts";

/**
 * What the "Your position" panel shows of the reader: their entry, their Rank and the climb toward
 * the next Division when ranked (none in Master), a word on Placement when signed in but Unranked,
 * nothing for a Guest.
 */
export function ownPosition<P extends { rank: Rank }>(own: P | null, isSignedIn: boolean) {
  if (own === null)
    return isSignedIn ? ({ kind: "unranked" } as const) : ({ kind: "guest" } as const);
  const { rank } = own;
  const next = nextRankName(rank);
  return {
    kind: "ranked",
    own,
    name: rankName(rank),
    progress: next === null ? null : { lp: rank.lp, next },
  } as const;
}
