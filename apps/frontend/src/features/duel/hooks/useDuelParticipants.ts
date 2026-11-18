import { useDuelStore } from "../store/useDuelStore.ts";

/** The Participant's own name and the Opponent's, once they have arrived. */
export function useDuelParticipants() {
  const seat = useDuelStore((state) => state.seat);
  const participants = useDuelStore((state) => state.participants);
  const self = participants.find((participant) => participant.seat === seat);
  const opponent = participants.find((participant) => participant.seat !== seat);
  return { self, opponent };
}
