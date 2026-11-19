import { rankLine } from "../rank/rankLine.ts";
import { useDuelStore } from "../store/useDuelStore.ts";

/**
 * The Participant's own name and the Opponent's, once they have arrived, whether the Opponent is
 * away, and in a ranked Duel the name of the Opponent's Rank.
 */
export function useDuelParticipants() {
  const seat = useDuelStore((state) => state.seat);
  const participants = useDuelStore((state) => state.participants);
  const ranks = useDuelStore((state) => state.ranks);
  const self = participants.find((participant) => participant.seat === seat);
  const opponent = participants.find((participant) => participant.seat !== seat);
  const opponentAway = opponent?.connected === false;
  // Connected as far as the Rank goes: the waiting screen says the Opponent is away on its own line.
  const opponentRank = opponent === undefined ? null : rankLine(ranks, opponent.seat, true);
  return { self, opponent, opponentAway, opponentRank };
}
