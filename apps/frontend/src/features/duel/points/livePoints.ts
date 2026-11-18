import { getPoints } from "@repo/duel-engine";
import { type Game, getLiveStats } from "@repo/typing-engine";

export type LiveSide = { readonly points: number; readonly wpm: number; readonly accuracy: number };

const NOTHING_TYPED: LiveSide = { points: 0, wpm: 0, accuracy: 0 };

function liveSide(game: Game, at: number): LiveSide {
  const { wpm, accuracy } = getLiveStats(game, at);
  return { points: getPoints({ wpm, accuracy }), wpm, accuracy };
}

/**
 * Both sides of a Round live, the Participant's own first, read at `at` on their own clock. The
 * Opponent's Game is read as much time after their start as has passed since the Participant's
 * own: both Games started at the same real instant, on two different clocks.
 */
export function livePoints(ownGame: Game, opponentGame: Game | null, at: number) {
  const own = liveSide(ownGame, at);
  if (opponentGame?.startedAt == null || ownGame.startedAt === null) {
    return { own, opponent: NOTHING_TYPED };
  }
  return {
    own,
    opponent: liveSide(opponentGame, opponentGame.startedAt + (at - ownGame.startedAt)),
  };
}
