import { type Game, SEPARATOR } from "@repo/typing-engine";
import { judgeLetter } from "../../game/words/judgeLetter.ts";
import { withoutSeparator } from "../../game/words/withoutSeparator.ts";

// Enough words before the active one to read what was just typed, without scrolling the rest away.
const WORDS_BEFORE_ACTIVE = 4;

/**
 * The `count` words a replay shows of the Game, from a few before the active word on, each letter
 * judged as a live Game shows it: extra letters lengthen a word, and a validated word's letters never
 * typed are missed.
 */
export function replayedWords(game: Game, count: number) {
  const first = Math.max(0, game.activeWordIndex - WORDS_BEFORE_ACTIVE);
  return game.targetWords.slice(first, first + count).map((target, offset) => {
    const index = first + offset;
    const input = game.inputs[index] ?? "";
    const word = withoutSeparator(target);
    const typed = withoutSeparator(input);
    const isValidated = input.endsWith(SEPARATOR);
    return {
      index,
      active: game.status !== "finished" && game.activeWordIndex === index,
      letters: Array.from({ length: Math.max(word.length, typed.length) }, (_, letterIndex) => ({
        char: word[letterIndex] ?? typed[letterIndex] ?? "",
        state: judgeLetter(word, typed, letterIndex, isValidated),
      })),
    };
  });
}
