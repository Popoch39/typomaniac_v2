import type { Game } from "./game.ts";
import { wordsPerMinute } from "./numbers.ts";
import { countChars } from "./result.ts";

/** Integers, meant to be displayed while the Game is played. */
export type LiveStats = {
  readonly wpm: number;
  readonly rawWpm: number;
  /** Percentage. */
  readonly accuracy: number;
};

/** `at` is the client timestamp in milliseconds of the instant the stats are read at. */
export function getLiveStats(game: Game, at: number): LiveStats {
  // Before the clock starts no time has elapsed, and a finished game no longer moves.
  const elapsedSeconds =
    game.startedAt === null ? 0 : ((game.endedAt ?? at) - game.startedAt) / 1000;
  // Unlike the Result, the live stats credit the active word in both modes, as Monkeytype does.
  const charCounts = countChars(game, true);
  const typedChars = charCounts.correct + charCounts.incorrect + charCounts.extra;
  const correctKeystrokes = game.keystrokes.filter((keystroke) => keystroke.correct).length;
  // Monkeytype floors the accuracy it displays, where it rounds the speeds.
  const accuracy =
    game.keystrokes.length === 0
      ? 0
      : Math.floor((correctKeystrokes / game.keystrokes.length) * 100);

  return {
    wpm: Math.round(wordsPerMinute(charCounts.exactWords, elapsedSeconds)),
    rawWpm: Math.round(wordsPerMinute(typedChars, elapsedSeconds)),
    accuracy,
  };
}
