import { getAverageMultiplier, getCurrentMultiplier, getPoints } from "@repo/duel-engine";
import { type Game, getLiveStats } from "@repo/typing-engine";
import { opponentReadAt } from "./opponentReadAt.ts";

export type LivePointsAndStats = {
  readonly points: number;
  readonly wpm: number;
  readonly accuracy: number;
  /** The Multiplier the Streak has reached, not the average the Points are weighed by. */
  readonly multiplier: number;
};

const NOTHING_TYPED: LivePointsAndStats = { points: 0, wpm: 0, accuracy: 0, multiplier: 1 };

function readLivePointsAndStats(game: Game, at: number): LivePointsAndStats {
  const { wpm, accuracy } = getLiveStats(game, at);
  // Live Points can differ by a few units from the server's final ones, which alone decide (ADR 0012).
  const points = getPoints({ wpm, accuracy, multiplier: getAverageMultiplier(game) });
  return { points, wpm, accuracy, multiplier: getCurrentMultiplier(game) };
}

/**
 * Both sides of a Round live, the Participant's own first, read at `at` on their own clock. The
 * Opponent's Game is read as much time after their start as has passed since the Participant's own.
 */
export function bothLivePointsAndStats(selfGame: Game, opponentGame: Game | null, at: number) {
  const self = readLivePointsAndStats(selfGame, at);
  const opponentAt = opponentReadAt(selfGame, opponentGame, at);
  if (opponentGame === null || opponentAt === null) return { self, opponent: NOTHING_TYPED };
  return { self, opponent: readLivePointsAndStats(opponentGame, opponentAt) };
}
