import { DEFAULT_RANKED_CONFIG, type RankedConfig } from "./config.ts";
import { placedRank } from "./ladder.ts";
import { lpChange, rankAfter } from "./lp.ts";
import { nextMmr } from "./mmr.ts";
import type { Standing } from "./standing.ts";

export type Outcome = "win" | "loss" | "draw";

const SCORE: Record<Outcome, number> = { win: 1, draw: 0.5, loss: 0 };

export type RankChange = "placed" | "promoted" | "demoted" | "none";

export type DuelUpdate = {
  standing: Standing;
  mmrDelta: number;
  /** LP gained or lost (LP-2): the full amount across a promotion or demotion, only the LP held when the floor at 0 LP cuts a loss. */
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
  const duelsPlayed = standing.duelsPlayed + 1;
  // Past Placement too, so a Player left Unranked (0 Placement Duels, a shorter Placement) gets placed.
  const placed = standing.rank === null && duelsPlayed >= config.placementDuels;
  // Read from the floored MMR, so it is the change applied and never −0.
  const mmrDelta = mmr - standing.mmr;
  if (placed) {
    const rank = placedRank(mmr, config);
    return { standing: { mmr, duelsPlayed, rank }, mmrDelta, lpDelta: 0, rankChange: "placed" };
  }
  if (standing.rank === null) {
    return { standing: { mmr, duelsPlayed, rank: null }, mmrDelta, lpDelta: 0, rankChange: "none" };
  }
  const { rank, lpDelta, rankChange } = rankAfter(
    standing.rank,
    lpChange(standing.rank, mmr, outcome, config),
    config,
  );
  return { standing: { mmr, duelsPlayed, rank }, mmrDelta, lpDelta, rankChange };
}
