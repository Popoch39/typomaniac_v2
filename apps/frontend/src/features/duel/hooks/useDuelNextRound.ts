import { getDuelOutcomes } from "@repo/duel-engine";
import { useDuelCountdownStore } from "../store/useDuelCountdownStore.ts";
import { useDuelStore } from "../store/useDuelStore.ts";

/** What follows the Round that just ended, in words: the next Round and its Start, or the end of the Duel. */
export function useDuelNextRound() {
  const rounds = useDuelStore((state) => state.rounds);
  const secondsLeft = useDuelCountdownStore((state) => state.secondsLeft);
  if (getDuelOutcomes(rounds.map((round) => round.outcomes)) !== null) return "The Duel is over…";
  return secondsLeft === null ? "Next Round coming…" : `Next Round starts in ${secondsLeft}…`;
}
