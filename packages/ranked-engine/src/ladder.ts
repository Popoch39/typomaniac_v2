import type { RankedConfig } from "./config.ts";
import type { Division, DivisionTier, LadderDivision, Rank } from "./types.ts";

type DivisionRank = Extract<Rank, { division: Division }>;

const TIERS: DivisionTier[] = ["bronze", "silver", "gold", "platinum", "diamond"];

/** Divisions from Bronze IV to Diamond I: a Division's index is its number of steps above Bronze IV. */
const LADDER = TIERS.flatMap((tier) =>
  ([4, 3, 2, 1] as const).map((division) => ({ tier, division })),
);

function isSameDivision(a: LadderDivision, b: LadderDivision): boolean {
  return a.tier === b.tier && a.division === b.division;
}

function referenceMmr(index: number, config: RankedConfig): number {
  return config.bronzeIvMmr + index * config.mmrPerDivision;
}

/** LADDER-1: the number of Divisions below the Rank's own; Master sits one step above Diamond I, past the end of the ladder. */
export function ladderIndex(rank: Rank): number {
  return rank.tier === "master"
    ? LADDER.length
    : LADDER.findIndex((step) => isSameDivision(step, rank));
}

/** LADDER-2: the Rank a ladder index and the LP held stand for, the inverse of `ladderIndex`. */
export function rankAtLadderIndex(index: number, lp: number): Rank {
  if (index === LADDER.length) return { tier: "master", lp };
  const step = LADDER[index];
  if (step === undefined) throw new RangeError(`No Division at ladder index ${index}`);
  return { ...step, lp };
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
): LadderDivision | { tier: "master" } | undefined {
  const index = ladderIndex(rank) + step;
  return index === LADDER.length ? { tier: "master" } : LADDER[index];
}

/** The highest Division whose reference MMR is at or below the MMR, at 0 LP, between Bronze IV and the Placement ceiling. */
export function placedRank(mmr: number, config: RankedConfig): DivisionRank {
  let placed: LadderDivision = { tier: "bronze", division: 4 };
  for (const [index, step] of LADDER.entries()) {
    if (referenceMmr(index, config) > mmr) break;
    placed = step;
    if (isSameDivision(step, config.placementCeiling)) break;
  }
  return { ...placed, lp: 0 };
}
