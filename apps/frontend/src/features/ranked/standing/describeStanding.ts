import type { Outcome, Rank } from "@repo/ranked-engine";
import { rankName } from "./rankName.ts";

/** A Player's Standing as the API gives it to them: the MMR is hidden (ADR 0006). */
export type VisibleStanding = {
  /** `null` while the Player is Unranked. */
  readonly rank: Rank | null;
  readonly placement: { readonly played: number; readonly total: number };
};

/** The Standing a Player reads of their own, with the Outcome of each Placement Duel they played. */
export type OwnStanding = VisibleStanding & {
  readonly placement: { readonly outcomes: readonly Outcome[] };
};

export type StandingSummary = { readonly headline: string; readonly detail: string };

/** The words a Standing is shown in: the Rank and its LP, or Unranked and the Placement progress. */
export function describeStanding({ rank, placement }: VisibleStanding): StandingSummary {
  if (rank === null) {
    return {
      headline: "Unranked",
      detail: `${placement.played} of ${placement.total} Placement Duels played`,
    };
  }
  return { headline: rankName(rank), detail: `${rank.lp} LP` };
}
