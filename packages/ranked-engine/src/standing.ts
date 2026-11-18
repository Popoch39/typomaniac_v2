import { DEFAULT_RANKED_CONFIG, type RankedConfig } from "./config.ts";

export type Tier = "bronze" | "silver" | "gold" | "platinum" | "diamond" | "master";

/** 4 is the lowest Division of a Tier, 1 the highest. */
export type Division = 1 | 2 | 3 | 4;

export type Rank =
  | { tier: Exclude<Tier, "master">; division: Division; lp: number }
  | { tier: "master"; lp: number };

export type Standing = {
  mmr: number;
  duelsPlayed: number;
  /** `null` while the Player is Unranked. */
  rank: Rank | null;
};

export function createStanding(config: RankedConfig = DEFAULT_RANKED_CONFIG): Standing {
  return { mmr: config.initialMmr, duelsPlayed: 0, rank: null };
}
