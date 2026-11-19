import { measureTyping, type CharCounts } from "./chars.ts";
import type { Game } from "./game.ts";
import { countInBucket, cutIntoBuckets, type Bucket } from "./history.ts";
import { countedKeyPresses, keyHoldDurations, keyPressGaps } from "./keys.ts";
import { consistency, roundTo2, wordsPerMinute } from "./numbers.ts";

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

// How many buckets the final inactivity looks back on.
const FINAL_BUCKETS = 5;

export function getResult(game: Game): Result {
  if (game.startedAt === null || game.endedAt === null) {
    throw new Error("The game is not finished: it has no result yet.");
  }

  // The speeds are computed from the rounded duration, as Monkeytype does.
  const duration = roundTo2((game.endedAt - game.startedAt) / 1000);
  // Cut short by the clock, the active word of a time game is credited for what was typed of it.
  const { charCounts, typedChars, accuracy } = measureTyping(game, {
    creditActiveWord: game.config.mode === "time",
  });
  const { startedAt } = game;
  const buckets = resultBuckets(game, game.endedAt, startedAt);
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

/**
 * The Game's WPM history as it stands at `at`, the client timestamp in milliseconds: one value per
 * whole second elapsed since the start, as the Result's, so that a live chart ends on the final one.
 */
export function getWpmHistory(game: Game, at: number): readonly number[] {
  if (game.startedAt === null) return [];
  // A finished Game no longer moves; one still played only has its whole seconds so far.
  const buckets =
    game.endedAt === null
      ? cutIntoBuckets(Math.max(0, at - game.startedAt), { withTail: false })
      : resultBuckets(game, game.endedAt, game.startedAt);
  return wpmHistory(game, buckets, game.startedAt);
}

// Only a words game gets a last, shorter bucket: a time game stops on its last whole second.
function resultBuckets(game: Game, endedAt: number, startedAt: number): readonly Bucket[] {
  return cutIntoBuckets(endedAt - startedAt, { withTail: game.config.mode === "words" });
}

function wpmHistory(game: Game, buckets: readonly Bucket[], startedAt: number): readonly number[] {
  return buckets.map((bucket) => {
    const reached = game.progress.filter((sample) => sample.at - startedAt <= bucket.until);
    // Nothing typed yet when the bucket ends: a game started on a signal, before its first letter.
    const creditedChars = reached.at(-1)?.creditedChars ?? 0;
    return Math.round(wordsPerMinute(creditedChars, bucket.until / 1000));
  });
}

function buildHistory(game: Game, buckets: readonly Bucket[], startedAt: number): History {
  const keystrokeInstants = game.keystrokes.map((keystroke) => keystroke.at - startedAt);
  const errorInstants = game.keystrokes
    .filter((keystroke) => !keystroke.correct)
    .map((keystroke) => keystroke.at - startedAt);

  return {
    wpm: wpmHistory(game, buckets, startedAt),
    keystrokeRate: buckets.map((bucket) =>
      Math.round(wordsPerMinute(countInBucket(keystrokeInstants, bucket), bucket.seconds)),
    ),
    errors: buckets.map((bucket) => countInBucket(errorInstants, bucket)),
  };
}
