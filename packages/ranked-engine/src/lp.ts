import type { RankedConfig } from "./config.ts";
import { adjacentDivision, rankReferenceMmr } from "./ladder.ts";
import type { Outcome, Rank, RankChange } from "./types.ts";

/** The signed LP won or lost (LP-2), pulled by the gap between the new MMR and the reference of the Division. */
export function lpDelta(rank: Rank, mmr: number, outcome: Outcome, config: RankedConfig): number {
  if (outcome === "draw") return 0;
  const gap = Math.trunc((mmr - rankReferenceMmr(rank, config)) / config.mmrPerLp);
  const amount = outcome === "win" ? config.baseLp + gap : config.baseLp - gap;
  const bounded = Math.min(config.maxLp, Math.max(config.minLp, amount));
  return outcome === "win" ? bounded : -bounded;
}

/**
 * The Rank after the LP-2 delta: a promotion at the LP per Division, a demotion on a loss at 0 LP.
 * The LP delta returned is the one applied: the full LP-2 delta across a promotion or demotion,
 * only the LP held when the floor at 0 LP cuts a loss.
 */
export function rankAfter(
  rank: Rank,
  delta: number,
  config: RankedConfig,
): { rank: Rank; lpDelta: number; rankChange: RankChange } {
  const lp = rank.lp + delta;
  const above = lp >= config.lpPerDivision ? adjacentDivision(rank, 1) : undefined;
  if (above !== undefined) {
    const promoted = { ...above, lp: lp - config.lpPerDivision };
    return { rank: promoted, lpDelta: delta, rankChange: "promoted" };
  }
  const below = rank.lp === 0 && delta < 0 ? adjacentDivision(rank, -1) : undefined;
  if (below !== undefined) {
    return { rank: { ...below, lp: config.demotionLp }, lpDelta: delta, rankChange: "demoted" };
  }
  // Bronze IV at 0 LP is the floor, and Master, with nothing above it, keeps every LP won.
  const floored = Math.max(0, lp);
  return { rank: { ...rank, lp: floored }, lpDelta: floored - rank.lp, rankChange: "none" };
}
