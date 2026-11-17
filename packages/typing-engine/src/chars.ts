import type { Game } from "./game.ts";

export const SEPARATOR = " ";

export type CharCounts = {
  readonly correct: number;
  readonly incorrect: number;
  readonly extra: number;
  readonly missed: number;
  /** Characters of the words typed exactly, separators included. */
  readonly exactWords: number;
};

/** What the Result and the live stats both read from a Game, before each rounds it its own way. */
export type TypingMeasure = {
  readonly charCounts: CharCounts;
  /** Correct, incorrect and extra characters: what the raw WPM is computed from. */
  readonly typedChars: number;
  /** Percentage, not rounded. */
  readonly accuracy: number;
};

type CountOptions = {
  /** Whether the correct start of the active word counts as typed exactly, its end not being missed. */
  readonly creditActiveWord: boolean;
};

const NO_CHARS: CharCounts = { correct: 0, incorrect: 0, extra: 0, missed: 0, exactWords: 0 };

export function measureTyping(game: Game, options: CountOptions): TypingMeasure {
  const charCounts = countChars(game, options);
  const correctKeystrokes = game.keystrokes.filter((keystroke) => keystroke.correct).length;
  return {
    charCounts,
    typedChars: charCounts.correct + charCounts.incorrect + charCounts.extra,
    // A game started on a signal can have no keystroke at all: the ratio is then undefined.
    accuracy: game.keystrokes.length === 0 ? 0 : (correctKeystrokes / game.keystrokes.length) * 100,
  };
}

export function countChars(game: Game, { creditActiveWord }: CountOptions): CharCounts {
  const { activeWordIndex } = game;
  return game.targetWords
    .slice(0, activeWordIndex + 1)
    .map((target, index) =>
      countWordChars(
        game.inputs[index] ?? "",
        target,
        creditActiveWord && index === activeWordIndex,
      ),
    )
    .reduce(addCharCounts, NO_CHARS);
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
