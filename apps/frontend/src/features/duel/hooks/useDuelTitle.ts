import { duelTitle } from "../round/duelTitle.ts";
import { useDuelStore } from "../store/useDuelStore.ts";

/** The Participant's Outcome of the Duel, in words, once its Rounds decide it; `null` before. */
export function useDuelTitle() {
  const rounds = useDuelStore((state) => state.rounds);
  const seat = useDuelStore((state) => state.seat);
  if (seat === null) return null;
  return duelTitle(
    rounds.map((round) => round.outcomes),
    seat,
  );
}
