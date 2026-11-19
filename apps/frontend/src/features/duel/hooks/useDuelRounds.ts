import { useDuelStore } from "../store/useDuelStore.ts";
import { roundCaption } from "../round/roundCaption.ts";
import { summariseRound } from "../round/summariseRound.ts";

/**
 * Every finished Round in order, each with the Participant's Outcome, its caption and both Results,
 * the Participant's own first.
 */
export function useDuelRounds() {
  const rounds = useDuelStore((state) => state.rounds);
  const seat = useDuelStore((state) => state.seat);
  const participants = useDuelStore((state) => state.participants);
  if (seat === null) return [];
  return rounds.map((round, index) => {
    const summary = summariseRound(round, { number: index + 1, seat, participants });
    return {
      number: summary.number,
      outcome: summary.outcome,
      caption: roundCaption(summary),
      sides: summary.sides,
    };
  });
}
