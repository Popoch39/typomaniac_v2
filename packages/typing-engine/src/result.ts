import { SEPARATOR, type Game } from "./game.ts";
import { countInBucket, cutIntoBuckets, type Bucket } from "./history.ts";
import { countedKeyPresses, keyHoldDurations, keyPressGaps } from "./keys.ts";
import { consistency, roundTo2, wordsPerMinute } from "./numbers.ts";

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
  /** 0 to 100, rounded to 2 decimals: how regular the keystroke rate was. */
  readonly consistency: number;
  readonly history: History;
  /** Milliseconds between consecutive key presses: one entry less than there are presses. */
  readonly keyPressGaps: readonly number[];
  /** Milliseconds each key was held: one entry per key press, in the order of the presses. */
  readonly keyHoldDurations: readonly number[];
  /** 0 to 100, rounded to 2 decimals: how regular the gaps between key presses were. */
  readonly keyConsistency: number;
  /** Number of buckets of the Game without any key press, insertion or deletion. */
  readonly inactiveSeconds: number;
  /** Whether the last buckets of the Game hold no keystroke at all. */
  readonly inactiveAtEnd: boolean;
};

/** One integer per bucket of the Game: one-second buckets counted from its start. */
export type History = {
  /** WPM reached at the end of each bucket, counted from the start of the Game. */
  readonly wpm: readonly number[];
  /** Keystrokes of each bucket alone, expressed in WPM. */
  readonly keystrokeRate: readonly number[];
  /** Incorrect keystrokes of each bucket. */
  readonly errors: readonly number[];
};

const NO_CHARS: CharCounts = { correct: 0, incorrect: 0, extra: 0, missed: 0, exactWords: 0 };
// How many buckets the final inactivity looks back on.
const FINAL_BUCKETS = 5;

export function getResult(game: Game): Result {
  if (game.startedAt === null || game.endedAt === null) {
    throw new Error("The game is not finished: it has no result yet.");
  }

  // The speeds are computed from the rounded duration, as Monkeytype does.
  const duration = roundTo2((game.endedAt - game.startedAt) / 1000);
  // Cut short by the clock, the active word of a time game is credited for what was typed of it.
  const charCounts = countChars(game, game.config.mode === "time");
  const typedChars = charCounts.correct + charCounts.incorrect + charCounts.extra;
  const correctKeystrokes = game.keystrokes.filter((keystroke) => keystroke.correct).length;
  // A game started on a signal can end without any keystroke: the ratio is then undefined.
  const accuracy =
    game.keystrokes.length === 0 ? 0 : (correctKeystrokes / game.keystrokes.length) * 100;
  const { startedAt } = game;
  // Only a words game gets a last, shorter bucket: a time game stops on its last whole second.
  const buckets = cutIntoBuckets(game.endedAt - startedAt, game.config.mode === "words");
  const history = buildHistory(game, buckets, startedAt);
  const keyPresses = countedKeyPresses(game, startedAt);
  const gaps = keyPressGaps(keyPresses, startedAt);
  // A deletion is an activity too: the key that makes it is not always among the presses received.
  const activityInstants = [...keyPresses, ...game.progress].map(({ at }) => at - startedAt);

  return {
    duration,
    wpm: roundTo2(wordsPerMinute(charCounts.exactWords, duration)),
    rawWpm: roundTo2(wordsPerMinute(typedChars, duration)),
    accuracy: roundTo2(accuracy),
    charCounts,
    consistency: consistency(history.keystrokeRate),
    history,
    keyPressGaps: gaps,
    keyHoldDurations: keyHoldDurations(game, keyPresses, startedAt),
    // The last gap is left out, as Monkeytype does.
    keyConsistency: consistency(gaps.slice(0, -1)),
    inactiveSeconds: buckets.filter((bucket) => countInBucket(activityInstants, bucket) === 0)
      .length,
    // A rate of 0 is a bucket without any keystroke. Without any bucket, nothing shows the player typing.
    inactiveAtEnd: history.keystrokeRate.slice(-FINAL_BUCKETS).every((rate) => rate === 0),
  };
}

function buildHistory(game: Game, buckets: readonly Bucket[], startedAt: number): History {
  const keystrokeInstants = game.keystrokes.map((keystroke) => keystroke.at - startedAt);
  const errorInstants = game.keystrokes
    .filter((keystroke) => !keystroke.correct)
    .map((keystroke) => keystroke.at - startedAt);

  return {
    wpm: buckets.map((bucket) => {
      const reached = game.progress.filter((sample) => sample.at - startedAt <= bucket.until);
      // Nothing typed yet when the bucket ends: a game started on a signal, before its first letter.
      const creditedChars = reached.at(-1)?.creditedChars ?? 0;
      return Math.round(wordsPerMinute(creditedChars, bucket.until / 1000));
    }),
    keystrokeRate: buckets.map((bucket) =>
      Math.round(wordsPerMinute(countInBucket(keystrokeInstants, bucket), bucket.seconds)),
    ),
    errors: buckets.map((bucket) => countInBucket(errorInstants, bucket)),
  };
}

export function countChars(game: Game, creditsActiveWord: boolean): CharCounts {
  const { activeWordIndex } = game;
  return game.targetWords
    .slice(0, activeWordIndex + 1)
    .map((target, index) =>
      countWordChars(
        game.inputs[index] ?? "",
        target,
        creditsActiveWord && index === activeWordIndex,
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
