import type { Outcome } from "@repo/duel-engine";
import type { RankedDuel, RankedGame } from "../../src/index.ts";

/** One saved Game of a ranked Duel at `wpm`, with `incorrect` incorrect Keystrokes. */
export const game = (wpm: number, incorrect = 0): RankedGame => ({
  wpm,
  // With incorrect Keystrokes, some correct ones too: the Player typed.
  accuracy: incorrect === 0 ? 100 : 95,
  history: { wpm: [wpm], keystrokeRate: [wpm], errors: [incorrect] },
});

/** A Game in which the Player typed nothing. */
export const idleGame: RankedGame = {
  wpm: 0,
  accuracy: 0,
  history: { wpm: [0], keystrokeRate: [0], errors: [0] },
};

/** A two-Round ranked Duel against `opponentId`, the Player's Games typed at `wpm` with `incorrect` mistakes each. */
export const duel = (
  wpm: number,
  {
    opponentId = "opponent",
    outcome = "win",
    incorrect = 0,
  }: { opponentId?: string | null; outcome?: Outcome; incorrect?: number } = {},
): RankedDuel => ({
  opponentId,
  outcome,
  games: [game(wpm, incorrect), game(wpm, incorrect)],
});

/** Ranked Duels, newest first, each against a different Opponent: what the Player played, oldest first. */
export const history = (...duels: RankedDuel[]) =>
  duels
    .map((played, index) => ({ ...played, opponentId: played.opponentId ?? `opponent-${index}` }))
    .reverse();
