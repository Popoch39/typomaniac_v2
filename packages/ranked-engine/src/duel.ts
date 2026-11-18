import { DEFAULT_RANKED_CONFIG, type RankedConfig } from "./config.ts";
import { nextMmr } from "./mmr.ts";
import type { Standing } from "./standing.ts";

export type Outcome = "win" | "loss" | "draw";

const SCORE: Record<Outcome, number> = { win: 1, draw: 0.5, loss: 0 };

export type RankChange = "placed" | "promoted" | "demoted" | "none";

export type DuelUpdate = {
  standing: Standing;
  mmrDelta: number;
  /** LP gained or lost, before any promotion or demotion moves the Rank. */
  lpDelta: number;
  rankChange: RankChange;
};

export function applyDuel(
  standing: Standing,
  opponentMmr: number,
  outcome: Outcome,
  config: RankedConfig = DEFAULT_RANKED_CONFIG,
): DuelUpdate {
  const inPlacement = standing.duelsPlayed < config.placementDuels;
  const kFactor = inPlacement ? config.placementKFactor : config.kFactor;
  const mmr = nextMmr(standing.mmr, opponentMmr, SCORE[outcome], kFactor);
  return {
    standing: { mmr, duelsPlayed: standing.duelsPlayed + 1, rank: null },
    // Read from the floored MMR, so it is the change applied and never −0.
    mmrDelta: mmr - standing.mmr,
    lpDelta: 0,
    rankChange: "none",
  };
}
