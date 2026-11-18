import type { RankedConfig } from "./config.ts";
import type { Outcome, RankChange } from "./duel.ts";
import { adjacentDivision, rankReferenceMmr } from "./ladder.ts";
import type { Rank } from "./standing.ts";

/** The signed LP won or lost, pulled by the gap between the new MMR and the reference of the Division. */
export function lpChange(rank: Rank, mmr: number, outcome: Outcome, config: RankedConfig): number {
  if (outcome === "draw") return 0;
  const gap = Math.trunc((mmr - rankReferenceMmr(rank, config)) / config.mmrPerLp);
  const amount = outcome === "win" ? config.baseLp + gap : config.baseLp - gap;
  const bounded = Math.min(config.maxLp, Math.max(config.minLp, amount));
  return outcome === "win" ? bounded : -bounded;
}

/** The Rank after the LP delta: a promotion at the LP per Division, a demotion on a loss at 0 LP. */
export function rankAfter(
  rank: Rank,
  lpDelta: number,
  config: RankedConfig,
): { rank: Rank; rankChange: RankChange } {
  const lp = rank.lp + lpDelta;
  if (rank.tier !== "master") {
    const above = lp >= config.lpPerDivision ? adjacentDivision(rank, 1) : undefined;
    if (above !== undefined) {
      return { rank: { ...above, lp: lp - config.lpPerDivision }, rankChange: "promoted" };
    }
    const below = rank.lp === 0 && lpDelta < 0 ? adjacentDivision(rank, -1) : undefined;
    if (below !== undefined) {
      return { rank: { ...below, lp: config.demotionLp }, rankChange: "demoted" };
    }
  }
  // Bronze IV at 0 LP is the floor. Until Master has its own rules, Diamond I and Master stop one LP short of the next Division.
  return {
    rank: { ...rank, lp: Math.min(config.lpPerDivision - 1, Math.max(0, lp)) },
    rankChange: "none",
  };
}
