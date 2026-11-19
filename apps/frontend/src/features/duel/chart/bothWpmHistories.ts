import { type Game, getLiveStats, getWpmHistory } from "@repo/typing-engine";
import { opponentReadAt } from "../points/opponentReadAt.ts";
import type { WpmHead } from "./wpmChart.ts";

type BothWpmHistories = {
  readonly histories: readonly [readonly number[], readonly number[]];
  /** Each side's live head, in the same order; `null` for a side that has typed nothing yet. */
  readonly heads: readonly [WpmHead | null, WpmHead | null];
};

/**
 * Both WPM histories of a Round live, the Participant's own first, read at `at` on their own clock
 * and the Opponent's at the same time since the Start, as the live Points are.
 */
export function bothWpmHistories(
  selfGame: Game,
  opponentGame: Game | null,
  at: number,
): BothWpmHistories {
  const opponentAt = opponentReadAt(selfGame, opponentGame, at);
  const opponentRead =
    opponentGame === null || opponentAt === null ? null : { game: opponentGame, at: opponentAt };
  return {
    histories: [
      getWpmHistory(selfGame, at),
      opponentRead === null ? [] : getWpmHistory(opponentRead.game, opponentRead.at),
    ],
    heads: [
      headOf(selfGame, at),
      opponentRead === null ? null : headOf(opponentRead.game, opponentRead.at),
    ],
  };
}

// The head shows the WPM between two per-second points, so the curve follows the typing in steps
// shorter than a second. In a Duel the Start comes before any Keystroke: a head then would draw a
// 0 WPM the Participant never typed.
function headOf(game: Game, at: number): WpmHead | null {
  if (game.startedAt === null || game.keystrokes.length === 0) return null;
  // A finished Game no longer moves, as its Live stats do not.
  return {
    seconds: ((game.endedAt ?? at) - game.startedAt) / 1000,
    wpm: getLiveStats(game, at).wpm,
  };
}
