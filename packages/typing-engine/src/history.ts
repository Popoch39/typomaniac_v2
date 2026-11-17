import { roundTo2 } from "./numbers.ts";

/** A slice of a Game. Instants are in milliseconds since the start of the Game. */
export type Bucket = {
  /** Exclusive. `-Infinity` for the first bucket, which also takes what is stamped at or before the start. */
  readonly after: number;
  /** Inclusive. */
  readonly until: number;
  readonly seconds: number;
};

const BUCKET_MS = 1000;

/**
 * One bucket per whole second elapsed, on a grid that starts with the Game. With `withTail`,
 * one more bucket runs up to the end when at least half a second is left.
 */
export function cutIntoBuckets(durationMs: number, withTail: boolean): readonly Bucket[] {
  const wholeSeconds = Math.floor(durationMs / BUCKET_MS);
  const ends = Array.from({ length: wholeSeconds }, (_, index) => (index + 1) * BUCKET_MS);
  // The rest is read on the duration rounded to 2 decimals, as Monkeytype does: 3.996 s leaves none.
  const restInHundredths = Math.round(roundTo2(durationMs / 1000) * 100) % 100;
  if (withTail && restInHundredths >= 50) ends.push(durationMs);

  return ends.map((until, index) => {
    const previous = ends[index - 1];
    return {
      after: previous ?? Number.NEGATIVE_INFINITY,
      until,
      seconds: (until - (previous ?? 0)) / 1000,
    };
  });
}

export function countInBucket(instants: readonly number[], bucket: Bucket): number {
  return instants.filter((instant) => instant > bucket.after && instant <= bucket.until).length;
}
