import type { Outcome } from "@repo/duel-engine";
import { useDuelStore } from "../store/useDuelStore.ts";

const OUTCOME_LABELS: Record<Outcome, string> = {
  win: "You win",
  loss: "You lose",
  draw: "Draw",
};

/** The Participant's Outcome of the Duel, in words. */
export function useDuelEnd() {
  const end = useDuelStore((state) => state.end);
  const seat = useDuelStore((state) => state.seat);
  if (end === null || seat === null) return null;
  return { outcome: OUTCOME_LABELS[end.outcomes[seat]] };
}
