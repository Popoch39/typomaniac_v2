import type { Division, Rank, Tier } from "@repo/ranked-engine";

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

/** The name a Rank is shown by: its Tier and its Division in Roman numerals, Master having none. */
export function rankName(rank: Rank) {
  const tier = TIER_NAMES[rank.tier];
  return rank.tier === "master" ? tier : `${tier} ${DIVISION_NUMERALS[rank.division]}`;
}
