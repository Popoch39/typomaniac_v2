import { DUEL_GAME_CONFIG } from "@repo/duel-engine";
import { useGameProgress } from "../../game/hooks/useGameProgress.ts";
import { useDuelStore } from "../store/useDuelStore.ts";

const asClock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/**
 * The band's clock: the whole Round during its Countdown, the time left while it runs, and 0:00 once
 * it is over, `isOver` greying it.
 */
export function useDuelClock() {
  const phase = useDuelStore((state) => state.phase);
  const round = useDuelStore((state) => state.round);
  const finishedRounds = useDuelStore((state) => state.rounds.length);
  // A Duel's Game is a `time` Game: its progress is the seconds left.
  const progress = useGameProgress();
  if (phase === "roundEnd" || phase === "finished") {
    return { text: asClock(0), label: `Round ${finishedRounds} over`, isOver: true };
  }
  const secondsLeft = phase === "running" ? Number(progress) : DUEL_GAME_CONFIG.seconds;
  const text = asClock(secondsLeft);
  return { text, label: `${text} left in Round ${round ?? 1}`, isOver: false };
}
