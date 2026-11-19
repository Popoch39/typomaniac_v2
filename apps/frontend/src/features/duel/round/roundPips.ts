import { type FinishedRound, getDuelOutcomes, MAX_ROUNDS, type Seat } from "@repo/duel-engine";

export type RoundPipState = "won" | "lost" | "drawn" | "current" | "upcoming";

export type RoundPip = {
  readonly number: number;
  readonly state: RoundPipState;
  /** What a screen reader says of the pip, naming the winner of a won Round. */
  readonly label: string;
};

export type RoundPips = {
  /** The Round being played, or the next one between Rounds; "Duel over" once it is decided. */
  readonly caption: string;
  readonly pips: readonly RoundPip[];
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
): RoundPips {
  // The deciding Round's end already settles the Duel, before the server ends it.
  const isOver =
    current === null || getDuelOutcomes(rounds.map(({ outcomes }) => outcomes)) !== null;
  const pips = Array.from({ length: MAX_ROUNDS }, (_, index): RoundPip => {
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
  // Between Rounds, the Round just finished is already counted: the caption names the next one.
  return { caption: isOver ? "Duel over" : `Round ${rounds.length + 1}`, pips };
}
