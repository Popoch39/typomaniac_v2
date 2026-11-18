import type { RankedConfig } from "./config.ts";
import type { Outcome } from "./duel.ts";
import { rankReferenceMmr } from "./ladder.ts";
import type { Rank } from "./standing.ts";

/** The signed LP won or lost, pulled by the gap between the new MMR and the reference of the Division. */
export function lpChange(rank: Rank, mmr: number, outcome: Outcome, config: RankedConfig): number {
  if (outcome === "draw") return 0;
  const gap = Math.trunc((mmr - rankReferenceMmr(rank, config)) / config.mmrPerLp);
  const amount = outcome === "win" ? config.baseLp + gap : config.baseLp - gap;
  const bounded = Math.min(config.maxLp, Math.max(config.minLp, amount));
  return outcome === "win" ? bounded : -bounded;
}

/** A loss floors at 0 LP and does not demote; until promotion exists, a win stops one LP short of it. */
export function rankAfter(rank: Rank, lpDelta: number, config: RankedConfig): Rank {
  return { ...rank, lp: Math.min(config.lpPerDivision - 1, Math.max(0, rank.lp + lpDelta)) };
}
