import { nextRoundLabel } from "../clock/nextRoundLabel.ts";
import { useDuelCountdownStore } from "../store/useDuelCountdownStore.ts";
import { useDuelStore } from "../store/useDuelStore.ts";

/** The time until the next Round's Start, in words; the last Round's end shows the Duel's instead. */
export function useDuelNextRound() {
  const rounds = useDuelStore((state) => state.rounds);
  const countdown = useDuelCountdownStore((state) => state.countdown);
  return nextRoundLabel(rounds.length + 1, countdown);
}
