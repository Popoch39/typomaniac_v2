import { type Game, getLiveStats, getWpmHistory } from "@repo/typing-engine";
import { opponentReadAt } from "../points/opponentReadAt.ts";
import type { WpmHead } from "./wpmChart.ts";

type BothWpmHistories = {
  readonly histories: readonly [readonly number[], readonly number[]];
  /** Each side's live head, in the same order; `null` for a side whose Game has not started. */
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

// The WPM between two seconds, as the Live stats show it, and when it was read.
function headOf(game: Game, at: number): WpmHead | null {
  if (game.startedAt === null) return null;
  // A finished Game no longer moves, as its Live stats do not.
  return {
    seconds: ((game.endedAt ?? at) - game.startedAt) / 1000,
    wpm: getLiveStats(game, at).wpm,
  };
}
