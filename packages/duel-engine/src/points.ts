import type { Result } from "@repo/typing-engine";
import { POINTS_FACTOR } from "./constants.ts";

/**
 * What a Game's Points are computed from: WPM and Accuracy, from a Result or from Live stats, and
 * the average Multiplier of its validated words.
 */
export type PointsMeasures = Pick<Result, "wpm" | "accuracy"> & { readonly multiplier: number };

/** What a Game of a Duel is worth: speed weighed by cleanliness, Accuracy counting twice. */
export function getPoints({ wpm, accuracy, multiplier }: PointsMeasures): number {
  return Math.round(wpm * (accuracy / 100) ** 2 * POINTS_FACTOR * multiplier);
}
