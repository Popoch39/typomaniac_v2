import type { Game } from "@repo/typing-engine";
import { MAX_MULTIPLIER, MULTIPLIER_STEP } from "./constants.ts";

/** The indexes of the words holding an incorrect Keystroke: none of them can be a Perfect word. */
function imperfectWordIndexes(game: Game): ReadonlySet<number> {
  // A Keystroke stays in the journal once corrected, and a Missed letter is a separator typed on a
  // letter: both leave an incorrect Keystroke on the word, which then can never be perfect.
  return new Set(
    game.keystrokes.filter((keystroke) => !keystroke.correct).map(({ wordIndex }) => wordIndex),
  );
}

/** What a word weighs once its Streak counts `streak` Perfect words, itself included. */
function streakWeight(streak: number): number {
  return streak === 0 ? 1 : Math.min(1 + (streak - 1) * MULTIPLIER_STEP, MAX_MULTIPLIER);
}

/**
 * The average Multiplier of a Game's validated words, 1 when none is validated: what its Points
 * are multiplied by (ADR 0013).
 */
export function getAverageMultiplier(game: Game): number {
  const validatedWords = game.targetWords.slice(0, game.activeWordIndex);
  if (validatedWords.length === 0) return 1;
  const imperfect = imperfectWordIndexes(game);
  let streak = 0;
  let total = 0;
  for (let index = 0; index < validatedWords.length; index += 1) {
    streak = imperfect.has(index) ? 0 : streak + 1;
    total += streakWeight(streak);
  }
  return total / validatedWords.length;
}

/** The Multiplier a Game's Streak has reached, shown live while the Round is played (ADR 0013). */
export function getCurrentMultiplier(game: Game): number {
  const imperfect = imperfectWordIndexes(game);
  // The word being typed is not validated yet, but a mistake already keeps it from being perfect.
  if (imperfect.has(game.activeWordIndex)) return 1;
  let streak = 0;
  for (let index = game.activeWordIndex - 1; index >= 0 && !imperfect.has(index); index -= 1) {
    streak += 1;
  }
  return streakWeight(streak);
}
