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

/** Master sits one step above Diamond I, past the end of the ladder. */
function ladderIndex(rank: Rank): number {
  return rank.tier === "master"
    ? LADDER.length
    : LADDER.findIndex((step) => step.tier === rank.tier && step.division === rank.division);
}

/** LP-1 reference of the Rank; in Master it rises with the LP held, so gains shrink as the LP outgrow the MMR. */
export function rankReferenceMmr(rank: Rank, config: RankedConfig): number {
  const reference = referenceMmr(ladderIndex(rank), config);
  if (rank.tier !== "master") return reference;
  return reference + Math.floor((rank.lp * config.mmrPerDivision) / config.lpPerDivision);
}

/** The Division one step above or below on the ladder, Master above Diamond I, or `undefined` past Bronze IV and Master. */
export function adjacentDivision(
  rank: Rank,
  step: 1 | -1,
): Omit<DivisionRank, "lp"> | { tier: "master" } | undefined {
  const index = ladderIndex(rank) + step;
  return index === LADDER.length ? { tier: "master" } : LADDER[index];
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
