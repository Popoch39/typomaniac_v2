import { SEPARATOR, type Game } from "./game.ts";

export type CharCounts = {
  readonly correct: number;
  readonly incorrect: number;
  readonly extra: number;
  readonly missed: number;
  /** Characters of the words typed exactly, separators included. */
  readonly exactWords: number;
};

export type Result = {
  /** Seconds, rounded to 2 decimals. */
  readonly duration: number;
  readonly wpm: number;
  readonly rawWpm: number;
  /** Percentage, rounded to 2 decimals. */
  readonly accuracy: number;
  readonly charCounts: CharCounts;
};

const NO_CHARS: CharCounts = { correct: 0, incorrect: 0, extra: 0, missed: 0, exactWords: 0 };

export function getResult(game: Game): Result {
  if (game.startedAt === null || game.endedAt === null) {
    throw new Error("The game is not finished: it has no result yet.");
  }

  // The speeds are computed from the rounded duration, as Monkeytype does.
  const duration = roundTo2((game.endedAt - game.startedAt) / 1000);
  const { activeWordIndex } = game;
  // Cut short by the clock, the active word of a time game is credited for what was typed of it.
  const creditsActiveWord = game.config.mode === "time";
  const charCounts = game.targetWords
    .slice(0, activeWordIndex + 1)
    .map((target, index) =>
      countWordChars(
        game.inputs[index] ?? "",
        target,
        creditsActiveWord && index === activeWordIndex,
      ),
    )
    .reduce(addCharCounts, NO_CHARS);
  const typedChars = charCounts.correct + charCounts.incorrect + charCounts.extra;
  const correctKeystrokes = game.keystrokes.filter((keystroke) => keystroke.correct).length;
  // A game started on a signal can end without any keystroke: the ratio is then undefined.
  const accuracy =
    game.keystrokes.length === 0 ? 0 : (correctKeystrokes / game.keystrokes.length) * 100;

  return {
    duration,
    wpm: roundTo2(wordsPerMinute(charCounts.exactWords, duration)),
    rawWpm: roundTo2(wordsPerMinute(typedChars, duration)),
    accuracy: roundTo2(accuracy),
    charCounts,
  };
}

function countWordChars(input: string, target: string, creditPartial: boolean): CharCounts {
  const exact = input === target;
  const credited = creditPartial ? target.startsWith(input) : exact;
  const validated = input.includes(SEPARATOR);
  let correct = 0;
  let incorrect = 0;
  let extra = 0;
  let missed = 0;
  for (let index = 0; index < Math.max(input.length, target.length); index++) {
    const typed = input[index];
    const expected = target[index];
    if (typed === undefined) missed += creditPartial ? 0 : 1;
    // Until a space validates the word, a letter on the separator position overflows the word.
    else if (expected === undefined || (expected === SEPARATOR && !validated)) extra++;
    // A separator only counts as correct when it closes an exact word.
    else if (typed !== expected || (typed === SEPARATOR && !exact)) incorrect++;
    else correct++;
  }
  return { correct, incorrect, extra, missed, exactWords: credited ? input.length : 0 };
}

function addCharCounts(total: CharCounts, word: CharCounts): CharCounts {
  return {
    correct: total.correct + word.correct,
    incorrect: total.incorrect + word.incorrect,
    extra: total.extra + word.extra,
    missed: total.missed + word.missed,
    exactWords: total.exactWords + word.exactWords,
  };
}

function wordsPerMinute(chars: number, seconds: number): number {
  if (seconds <= 0) return 0;
  return chars / 5 / (seconds / 60);
}

function roundTo2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
