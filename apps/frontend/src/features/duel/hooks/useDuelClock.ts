import { useGameProgress } from "../../game/hooks/useGameProgress.ts";
import { bandClock } from "../clock/bandClock.ts";
import { useDuelStore } from "../store/useDuelStore.ts";

export function useDuelClock() {
  const phase = useDuelStore((state) => state.phase);
  const round = useDuelStore((state) => state.round);
  const finishedRounds = useDuelStore((state) => state.rounds.length);
  // A Duel's Game is a `time` Game: its progress is the seconds left.
  const progress = useGameProgress();
  return bandClock({ phase, secondsLeft: Number(progress), round, finishedRounds });
}
