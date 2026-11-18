import type { LadderDivision } from "./types.ts";

export type RankedConfig = {
  initialMmr: number;
  kFactor: number;
  placementKFactor: number;
  placementDuels: number;
  /** Reference MMR of Bronze IV, the lowest Division. */
  bronzeIvMmr: number;
  /** MMR between the references of two consecutive Divisions; Master starts one step above Diamond I. */
  mmrPerDivision: number;
  lpPerDivision: number;
  baseLp: number;
  minLp: number;
  maxLp: number;
  /** MMR of gap to the reference that adds or removes 1 LP. */
  mmrPerLp: number;
  /** LP held right after a demotion. */
  demotionLp: number;
  /** Highest Division a Placement can give. */
  placementCeiling: LadderDivision;
};

export const DEFAULT_RANKED_CONFIG: RankedConfig = {
  initialMmr: 1200,
  kFactor: 32,
  placementKFactor: 64,
  placementDuels: 5,
  bronzeIvMmr: 900,
  mmrPerDivision: 50,
  lpPerDivision: 100,
  baseLp: 20,
  minLp: 10,
  maxLp: 30,
  mmrPerLp: 5,
  demotionLp: 75,
  placementCeiling: { tier: "platinum", division: 4 },
};
