import { DUEL_GAME_CONFIG } from "@repo/duel-engine";
import { formatClock } from "../../../shared/lib/formatClock.ts";
import type { DuelPhase } from "../phase/duelPhase.ts";

/**
 * The band's clock: the whole Round during its Countdown, `secondsLeft` while it runs, and 0:00
 * once it is over, `isOver` greying it.
 */
export function bandClock({
  phase,
  secondsLeft,
  round,
  finishedRounds,
}: {
  readonly phase: DuelPhase;
  readonly secondsLeft: number;
  /** The Round being played, `null` before the first is announced. */
  readonly round: number | null;
  readonly finishedRounds: number;
}) {
  if (phase === "roundEnd" || phase === "finished") {
    return { text: formatClock(0), label: `Round ${finishedRounds} over`, isOver: true };
  }
  const text = formatClock(phase === "running" ? secondsLeft : DUEL_GAME_CONFIG.seconds);
  return { text, label: `${text} left in Round ${round ?? 1}`, isOver: false };
}
