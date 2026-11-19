import type { Game } from "@repo/typing-engine";

/**
 * The instant, on the Opponent's own clock, as long after their Start as `at` is after the
 * Participant's own: both Games started at the same real instant, on two different clocks. `null`
 * while either Game has not started.
 */
export function opponentReadAt(
  selfGame: Game,
  opponentGame: Game | null,
  at: number,
): number | null {
  if (opponentGame?.startedAt == null || selfGame.startedAt === null) return null;
  return opponentGame.startedAt + (at - selfGame.startedAt);
}
