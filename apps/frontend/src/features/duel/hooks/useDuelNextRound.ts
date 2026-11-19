import { getDuelOutcomes } from "@repo/duel-engine";
import { useDuelCountdownStore } from "../store/useDuelCountdownStore.ts";
import { useDuelStore } from "../store/useDuelStore.ts";

/** What follows the Round that just ended, in words: the time until the next Round's Start, or the end of the Duel. */
export function useDuelNextRound() {
  const rounds = useDuelStore((state) => state.rounds);
  const secondsLeft = useDuelCountdownStore((state) => state.secondsLeft);
  if (getDuelOutcomes(rounds.map((round) => round.outcomes)) !== null) return "Duel over";
  const next = `Round ${rounds.length + 1}`;
  return secondsLeft === null
    ? `${next} soon`
    : `${next} in 0:${String(secondsLeft).padStart(2, "0")}`;
}
