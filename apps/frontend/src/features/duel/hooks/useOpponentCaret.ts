import { opponentCaretPosition } from "../caret/opponentCaretPosition.ts";
import { useDuelStore } from "../store/useDuelStore.ts";
import { useDuelParticipants } from "./useDuelParticipants.ts";

/** The Opponent's name when their caret sits before this letter, `null` anywhere else. */
export function useOpponentCaret(wordIndex: number, letterIndex: number) {
  // A boolean, so that the Opponent's typing re-renders only the letters their caret leaves or reaches.
  const isHere = useDuelStore((state) => {
    if (state.opponentGame === null) return false;
    const caret = opponentCaretPosition(state.opponentGame);
    return caret.wordIndex === wordIndex && caret.letterIndex === letterIndex;
  });
  const { opponent } = useDuelParticipants();
  return isHere ? (opponent?.name ?? null) : null;
}
