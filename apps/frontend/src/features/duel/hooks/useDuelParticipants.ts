import { seatRankName } from "../rank/seatRankName.ts";
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
  const opponentRank = opponent === undefined ? null : seatRankName(ranks, opponent.seat);
  return { self, opponent, opponentAway, opponentRank };
}
