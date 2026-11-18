import { useGameStore } from "../store/useGameStore.ts";

function scrollToWord(word: HTMLElement | null) {
  const wordList = word?.parentElement;
  if (!word || !wordList) return;
  // Keeps the line above in view, so that a word Backspace can return to stays visible.
  wordList.scrollTop = Math.max(0, word.offsetTop - word.offsetHeight);
}

/** Ref callback for a word: it scrolls the word list when this word becomes the active one. */
export function useActiveWordScroll(index: number) {
  const isActive = useGameStore((state) => state.game.activeWordIndex === index);
  return isActive ? scrollToWord : undefined;
}
