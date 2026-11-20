import type { Rank } from "@repo/ranked-engine";
import { rankName } from "../../ranked/standing/rankName.ts";

/** A reviewed Player's whole Standing, the MMR included: the administrator sees what a Player does not. */
export type ReviewedStanding = {
  readonly mmr: number;
  readonly duelsPlayed: number;
  readonly rank: Rank | null;
};

/** The reviewed Player's Standing on one line. */
export function reviewStandingLine({ mmr, duelsPlayed, rank }: ReviewedStanding) {
  const duels = `${duelsPlayed} ranked ${duelsPlayed === 1 ? "Duel" : "Duels"}`;
  const placed = rank === null ? "Unranked" : `${rankName(rank)} · ${rank.lp} LP`;
  return `${placed} · MMR ${mmr} · ${duels}`;
}
