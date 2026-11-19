import { useDuelCountdownStore } from "../store/useDuelCountdownStore.ts";
import { useDuelStore } from "../store/useDuelStore.ts";

/** The time until the next Round's Start, in words; the last Round's end shows the Duel's instead. */
export function useDuelNextRound() {
  const rounds = useDuelStore((state) => state.rounds);
  const secondsLeft = useDuelCountdownStore((state) => state.secondsLeft);
  const next = `Round ${rounds.length + 1}`;
  return secondsLeft === null
    ? `${next} soon`
    : `${next} in 0:${String(secondsLeft).padStart(2, "0")}`;
}
