import { useOpponentCaretStore } from "../store/useOpponentCaretStore.ts";

/** The Opponent's name when their caret sits before this letter, `null` anywhere else. */
export function useOpponentCaret(wordIndex: number, letterIndex: number) {
  // A name or `null`, so that the Opponent's typing re-renders only the letters their caret leaves or reaches.
  return useOpponentCaretStore(({ caret }) =>
    caret?.wordIndex === wordIndex && caret.letterIndex === letterIndex ? caret.name : null,
  );
}
