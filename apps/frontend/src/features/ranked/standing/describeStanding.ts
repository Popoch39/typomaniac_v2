import type { Division, Rank, Tier } from "@repo/ranked-engine";

/** A Player's Standing as the API gives it to them: the MMR is hidden (ADR 0006). */
export type VisibleStanding = {
  /** `null` while the Player is Unranked. */
  readonly rank: Rank | null;
  readonly placement: { readonly played: number; readonly total: number };
};

export type StandingSummary = { readonly headline: string; readonly detail: string };

const TIER_NAMES: Readonly<Record<Tier, string>> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  diamond: "Diamond",
  master: "Master",
};

const DIVISION_NUMERALS: Readonly<Record<Division, string>> = {
  1: "I",
  2: "II",
  3: "III",
  4: "IV",
};

/** The words a Standing is shown in: the Rank and its LP, or Unranked and the Placement progress. */
export function describeStanding({ rank, placement }: VisibleStanding): StandingSummary {
  if (rank === null) {
    return {
      headline: "Unranked",
      detail: `${placement.played} of ${placement.total} Placement Duels played`,
    };
  }
  const tier = TIER_NAMES[rank.tier];
  return {
    headline: rank.tier === "master" ? tier : `${tier} ${DIVISION_NUMERALS[rank.division]}`,
    detail: `${rank.lp} LP`,
  };
}
