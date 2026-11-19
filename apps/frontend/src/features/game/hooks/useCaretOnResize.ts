import { snapCaret } from "../caret/followCaret.ts";

/** Ref callback for the word list: a resize re-wraps the words, which moves the caret's anchor without a keystroke. */
export function useCaretOnResize() {
  return (wordList: HTMLElement | null) => {
    if (wordList === null) return;
    const observer = new ResizeObserver(() =>
      snapCaret(wordList.querySelector<HTMLElement>("[data-caret-anchor]")),
    );
    observer.observe(wordList);
    return () => observer.disconnect();
  };
}
