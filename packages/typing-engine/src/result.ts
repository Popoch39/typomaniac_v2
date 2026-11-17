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

export function getResult(game: Game): Result {
  if (game.startedAt === null || game.endedAt === null) {
    throw new Error("The game is not finished: it has no result yet.");
  }

  // The speeds are computed from the rounded duration, as Monkeytype does.
  const duration = roundTo2((game.endedAt - game.startedAt) / 1000);
  const charCounts = game.targetWords
    .map((target, index) => countWordChars(game.inputs[index] ?? "", target))
    .reduce(addCharCounts);
  const typedChars = charCounts.correct + charCounts.incorrect + charCounts.extra;
  // A finished game has at least the keystroke that ended it: the ratio is always defined.
  const correctKeystrokes = game.keystrokes.filter((keystroke) => keystroke.correct).length;

  return {
    duration,
    wpm: roundTo2(wordsPerMinute(charCounts.exactWords, duration)),
    rawWpm: roundTo2(wordsPerMinute(typedChars, duration)),
    accuracy: roundTo2((correctKeystrokes / game.keystrokes.length) * 100),
    charCounts,
  };
}

function countWordChars(input: string, target: string): CharCounts {
  const exact = input === target;
  let correct = 0;
  let incorrect = 0;
  let extra = 0;
  let missed = 0;
  for (let index = 0; index < Math.max(input.length, target.length); index++) {
    const typed = input[index];
    const expected = target[index];
    if (typed === undefined) missed++;
    else if (expected === undefined) extra++;
    // A separator only counts as correct when it closes an exact word.
    else if (typed !== expected || (typed === SEPARATOR && !exact)) incorrect++;
    else correct++;
  }
  return { correct, incorrect, extra, missed, exactWords: exact ? target.length : 0 };
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
