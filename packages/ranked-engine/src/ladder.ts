import type { RankedConfig } from "./config.ts";
import type { Division, Rank, Tier } from "./standing.ts";

type DivisionRank = Extract<Rank, { division: Division }>;

const TIERS: Exclude<Tier, "master">[] = ["bronze", "silver", "gold", "platinum", "diamond"];

/** Divisions from Bronze IV to Diamond I: a Division's index is its number of steps above Bronze IV. */
const LADDER = TIERS.flatMap((tier) =>
  ([4, 3, 2, 1] as const).map((division) => ({ tier, division })),
);

function referenceMmr(index: number, config: RankedConfig): number {
  return config.bronzeIvMmr + index * config.mmrPerDivision;
}

/** The highest Division whose reference MMR is at or below the MMR, at 0 LP, between Bronze IV and the Placement ceiling. */
export function placedRank(mmr: number, config: RankedConfig): DivisionRank {
  const ceiling = config.placementCeiling;
  let placed: Omit<DivisionRank, "lp"> = { tier: "bronze", division: 4 };
  for (const [index, step] of LADDER.entries()) {
    if (referenceMmr(index, config) > mmr) break;
    placed = step;
    if (step.tier === ceiling.tier && step.division === ceiling.division) break;
  }
  return { ...placed, lp: 0 };
}
