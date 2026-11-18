import { useDuelStore } from "../store/useDuelStore.ts";
import { ownRoundScore } from "../round/roundScore.ts";

/** The Round score, the Participant's own Rounds won first, and the Round being played, if any. */
export function useDuelRoundScore() {
  const rounds = useDuelStore((state) => state.rounds);
  const seat = useDuelStore((state) => state.seat);
  const round = useDuelStore((state) => state.round);
  const phase = useDuelStore((state) => state.phase);
  if (seat === null) return null;
  // Once the Duel has ended, no Round is being played.
  return { ...ownRoundScore(rounds, seat), round: phase === "finished" ? null : round };
}
