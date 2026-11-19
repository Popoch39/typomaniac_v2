import { type Game, getWpmHistory } from "@repo/typing-engine";
import { opponentReadAt } from "../points/opponentReadAt.ts";

/**
 * Both WPM histories of a Round live, the Participant's own first, read at `at` on their own clock
 * and the Opponent's at the same time since the Start, as the live Points are.
 */
export function bothWpmHistories(
  selfGame: Game,
  opponentGame: Game | null,
  at: number,
): readonly [readonly number[], readonly number[]] {
  const opponentAt = opponentReadAt(selfGame, opponentGame, at);
  return [
    getWpmHistory(selfGame, at),
    opponentGame === null || opponentAt === null ? [] : getWpmHistory(opponentGame, opponentAt),
  ];
}
