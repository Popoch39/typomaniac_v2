import type { Game } from "@repo/typing-engine";
import { MAX_MULTIPLIER, MULTIPLIER_STEP } from "./constants.ts";

/**
 * The average Multiplier of a Game's validated words, 1 when none is validated: what its Points
 * are multiplied by (ADR 0013).
 */
export function getAverageMultiplier(game: Game): number {
  const validatedWords = game.targetWords.slice(0, game.activeWordIndex);
  if (validatedWords.length === 0) return 1;
  // A Keystroke stays in the journal once corrected, and a Missed letter is a separator typed on a
  // letter: both leave an incorrect Keystroke on the word, which then can never be perfect.
  const imperfect = new Set(
    game.keystrokes.filter((keystroke) => !keystroke.correct).map(({ wordIndex }) => wordIndex),
  );
  let streak = 0;
  let total = 0;
  for (let index = 0; index < validatedWords.length; index += 1) {
    streak = imperfect.has(index) ? 0 : streak + 1;
    total += streak === 0 ? 1 : Math.min(1 + (streak - 1) * MULTIPLIER_STEP, MAX_MULTIPLIER);
  }
  return total / validatedWords.length;
}
