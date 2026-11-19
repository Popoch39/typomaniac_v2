import { useOpponentCaretStore } from "../store/useOpponentCaretStore.ts";

/** The Opponent when their caret sits before this letter, `null` anywhere else. */
export function useOpponentCaret(wordIndex: number, letterIndex: number) {
  // The same Opponent object while they type, or `null`, so that the Opponent's typing re-renders only the
  // letters their caret leaves or reaches.
  return useOpponentCaretStore(({ caret }) =>
    caret?.wordIndex === wordIndex && caret.letterIndex === letterIndex ? caret.opponent : null,
  );
}
