import { useDuelStore } from "../store/useDuelStore.ts";
import { roundTitle } from "../round/roundTitle.ts";
import { summariseRound } from "../round/summariseRound.ts";

/** Every finished Round in order, each with its title and both Results, the Participant's own first. */
export function useDuelRounds() {
  const rounds = useDuelStore((state) => state.rounds);
  const seat = useDuelStore((state) => state.seat);
  const participants = useDuelStore((state) => state.participants);
  if (seat === null) return [];
  return rounds.map((round, index) => {
    const { number, outcome, sides } = summariseRound(round, {
      number: index + 1,
      seat,
      participants,
    });
    return { number, title: roundTitle(number, outcome), sides };
  });
}
