import { judgeLetter } from "./judgeLetter.ts";

/** Letters that follow each other in a word: the first one's index, and how many. */
export type LetterRun = { start: number; letters: number };

/**
 * A Wrong word's mistakes, its incorrect, extra and missed letters, those that follow each other in one run,
 * so each run gets its own wave and the correct letters stay clear. Both texts are without their Separator.
 */
export function mistakeRuns(word: string, typed: string): LetterRun[] {
  const runs: LetterRun[] = [];
  const letterCount = Math.max(word.length, typed.length);

  for (let letterIndex = 0; letterIndex < letterCount; letterIndex++) {
    if (judgeLetter(word, typed, letterIndex, true) === "correct") continue;
    const last = runs.at(-1);
    if (last !== undefined && last.start + last.letters === letterIndex) {
      last.letters += 1;
    } else {
      runs.push({ start: letterIndex, letters: 1 });
    }
  }

  return runs;
}
