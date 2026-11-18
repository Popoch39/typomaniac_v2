import type { Result } from "@repo/typing-engine";
import { POINTS_FACTOR } from "./constants.ts";

/**
 * What a Game of a Duel is worth: speed weighed by cleanliness, Accuracy counting twice.
 * Takes a Result as well as Live stats, which carry the same two measures.
 */
export function getPoints({ wpm, accuracy }: Pick<Result, "wpm" | "accuracy">): number {
  return Math.round(wpm * (accuracy / 100) ** 2 * POINTS_FACTOR);
}
