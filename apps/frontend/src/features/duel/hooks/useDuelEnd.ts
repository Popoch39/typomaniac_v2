import type { Outcome } from "@repo/duel-engine";
import { useDuelStore } from "../store/useDuelStore.ts";

const OUTCOME_LABELS: Record<Outcome, string> = {
  win: "You win",
  loss: "You lose",
  draw: "Draw",
};

/** The Participant's Outcome and both Results, the Participant's own first. */
export function useDuelEnd() {
  const end = useDuelStore((state) => state.end);
  const seat = useDuelStore((state) => state.seat);
  const participants = useDuelStore((state) => state.participants);
  if (end === null || seat === null) return null;
  const opponentSeat = seat === 0 ? 1 : 0;
  const sides = [seat, opponentSeat].map((side) => ({
    seat: side,
    name: participants.find((participant) => participant.seat === side)?.name ?? "",
    result: end.results[side],
  }));
  return { outcome: OUTCOME_LABELS[end.outcomes[seat]], sides };
}
