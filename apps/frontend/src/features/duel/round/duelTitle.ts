import { getDuelOutcomes, type Outcome, type RoundOutcomes, type Seat } from "@repo/duel-engine";

const TITLES: Readonly<Record<Outcome, string>> = {
  win: "Duel won",
  loss: "Duel lost",
  draw: "Duel drawn",
};

/**
 * The Outcome of the Duel for the Participant on `seat`, in words, read from the Rounds finished
 * so far: it is known as soon as the last Round ends, before the server ends the Duel, so the end
 * of the Duel shows it in place. `null` while the Duel is undecided.
 */
export function duelTitle(rounds: readonly RoundOutcomes[], seat: Seat) {
  const outcomes = getDuelOutcomes(rounds);
  return outcomes === null ? null : TITLES[outcomes[seat]];
}
