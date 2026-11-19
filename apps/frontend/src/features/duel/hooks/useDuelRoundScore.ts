import { useDuelStore } from "../store/useDuelStore.ts";
import { ownRoundScore } from "../round/roundScore.ts";

/** The Round score, the Participant's own Rounds won first. */
export function useDuelRoundScore() {
  const rounds = useDuelStore((state) => state.rounds);
  const seat = useDuelStore((state) => state.seat);
  // No Round can have been played before the seat is known.
  const { own, opponent } = seat === null ? { own: 0, opponent: 0 } : ownRoundScore(rounds, seat);
  return `${own}–${opponent}`;
}
