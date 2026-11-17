import { measureTyping } from "./chars.ts";
import type { Game } from "./game.ts";
import { wordsPerMinute } from "./numbers.ts";

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
  const { charCounts, typedChars, accuracy } = measureTyping(game, { creditActiveWord: true });

  return {
    wpm: Math.round(wordsPerMinute(charCounts.exactWords, elapsedSeconds)),
    rawWpm: Math.round(wordsPerMinute(typedChars, elapsedSeconds)),
    // Monkeytype floors the accuracy it displays, where it rounds the speeds.
    accuracy: Math.floor(accuracy),
  };
}
