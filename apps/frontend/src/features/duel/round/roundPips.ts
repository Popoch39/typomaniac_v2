import { type FinishedRound, MAX_ROUNDS, type Seat } from "@repo/duel-engine";

export type RoundPipState = "won" | "lost" | "drawn" | "current" | "upcoming";

export type RoundPip = {
  readonly number: number;
  readonly state: RoundPipState;
  /** What a screen reader says of the pip, naming the winner of a won Round. */
  readonly label: string;
};

const STATES = { win: "won", loss: "lost", draw: "drawn" } as const;

/**
 * One pip per Round of the Duel, as the Participant on `seat` reads them: the Rounds finished by
 * their Outcome, `current` the Round being played (`null` once the Duel is over), and the rest
 * upcoming. Always the best of three, so the band keeps its shape when a Duel ends early.
 */
export function roundPips(
  rounds: readonly FinishedRound[],
  current: number | null,
  seat: Seat,
  names: { readonly self: string; readonly opponent: string },
): RoundPip[] {
  return Array.from({ length: MAX_ROUNDS }, (_, index): RoundPip => {
    const number = index + 1;
    const finished = rounds[index];
    if (finished !== undefined) {
      const state = STATES[finished.outcomes[seat]];
      if (state === "drawn") return { number, state, label: `Round ${number} drawn` };
      const winner = state === "won" ? names.self : names.opponent;
      return { number, state, label: `Round ${number} won by ${winner}` };
    }
    if (number === current) return { number, state: "current", label: `Round ${number} in play` };
    return { number, state: "upcoming", label: `Round ${number} not played` };
  });
}
