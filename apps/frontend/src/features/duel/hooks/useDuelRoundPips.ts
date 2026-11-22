import { roundOf } from "../phase/duelPhase.ts";
import { roundPips } from "../round/roundPips.ts";
import { useDuelStore } from "../store/useDuelStore.ts";
import { useDuelParticipants } from "./useDuelParticipants.ts";

/** The three Round pips from the Participant's own seat, with a caption naming the Round in play. */
export function useDuelRoundPips() {
  const seat = useDuelStore((state) => state.seat);
  // Once the Duel has ended, no Round is being played.
  const current = useDuelStore((state) => roundOf(state.lifecycle));
  const rounds = useDuelStore((state) => state.rounds);
  const { self, opponent } = useDuelParticipants();
  if (seat === null) return { caption: "", pips: [] };
  const names = { self: self?.name ?? "", opponent: opponent?.name ?? "" };
  return roundPips(rounds, current, seat, names);
}
