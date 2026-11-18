export type Tier = "bronze" | "silver" | "gold" | "platinum" | "diamond" | "master";

/** Every Tier but Master is split into Divisions. */
export type DivisionTier = Exclude<Tier, "master">;

/** 4 is the lowest Division of a Tier, 1 the highest. */
export type Division = 1 | 2 | 3 | 4;

/** A Division of the ladder, such as Silver II. */
export type LadderDivision = { tier: DivisionTier; division: Division };

export type Rank = (LadderDivision & { lp: number }) | { tier: "master"; lp: number };

export type Standing = {
  mmr: number;
  duelsPlayed: number;
  /** `null` while the Player is Unranked. */
  rank: Rank | null;
};

export type Outcome = "win" | "loss" | "draw";

export type RankChange = "placed" | "promoted" | "demoted" | "none";
