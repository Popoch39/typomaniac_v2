import { useDuelStore } from "../store/useDuelStore.ts";

/** The Participant's own name and the Opponent's, once they have arrived, and whether the Opponent is away. */
export function useDuelParticipants() {
  const seat = useDuelStore((state) => state.seat);
  const participants = useDuelStore((state) => state.participants);
  const self = participants.find((participant) => participant.seat === seat);
  const opponent = participants.find((participant) => participant.seat !== seat);
  const opponentAway = opponent?.connected === false;
  return { self, opponent, opponentAway };
}
