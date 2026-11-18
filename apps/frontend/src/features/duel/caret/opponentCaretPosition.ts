import type { Game } from "@repo/typing-engine";
import { withoutSeparator } from "../../game/words/withoutSeparator.ts";

export type CaretPosition = { readonly wordIndex: number; readonly letterIndex: number };

/**
 * Where the Opponent's caret is drawn in the Participant's own text. The Opponent's extra letters
 * are mistakes, which are not drawn, so the caret never goes past the end of the Target word.
 */
export function opponentCaretPosition(game: Game): CaretPosition {
  const wordIndex = game.activeWordIndex;
  const target = withoutSeparator(game.targetWords[wordIndex] ?? "");
  const typed = withoutSeparator(game.inputs[wordIndex] ?? "");
  return { wordIndex, letterIndex: Math.min(typed.length, target.length) };
}
