import { getPoints } from "@repo/duel-engine";
import { type Game, getLiveStats } from "@repo/typing-engine";

export type LivePointsAndStats = {
  readonly points: number;
  readonly wpm: number;
  readonly accuracy: number;
};

const NOTHING_TYPED: LivePointsAndStats = { points: 0, wpm: 0, accuracy: 0 };

function readLivePointsAndStats(game: Game, at: number): LivePointsAndStats {
  const { wpm, accuracy } = getLiveStats(game, at);
  return { points: getPoints({ wpm, accuracy }), wpm, accuracy };
}

/**
 * Both sides of a Round live, the Participant's own first, read at `at` on their own clock. The
 * Opponent's Game is read as much time after their start as has passed since the Participant's
 * own: both Games started at the same real instant, on two different clocks.
 */
export function bothLivePointsAndStats(selfGame: Game, opponentGame: Game | null, at: number) {
  const self = readLivePointsAndStats(selfGame, at);
  if (opponentGame?.startedAt == null || selfGame.startedAt === null) {
    return { self, opponent: NOTHING_TYPED };
  }
  return {
    self,
    opponent: readLivePointsAndStats(
      opponentGame,
      opponentGame.startedAt + (at - selfGame.startedAt),
    ),
  };
}
