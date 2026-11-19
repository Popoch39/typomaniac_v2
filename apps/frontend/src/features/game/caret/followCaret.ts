function placeCaret(anchor: HTMLElement | null, glides: boolean) {
  const word = anchor?.parentElement;
  const wordList = word?.parentElement;
  const caret = wordList?.parentElement?.querySelector<HTMLElement>("[data-caret]");
  if (!anchor || !word || !wordList || !caret) return;
  // Keeps the line above in view, so that a word Backspace can return to stays visible.
  wordList.scrollTop = Math.max(0, word.offsetTop - word.offsetHeight);
  const viewport = wordList.getBoundingClientRect();
  const target = anchor.getBoundingClientRect();
  const translate = `${target.left - viewport.left}px ${target.top - viewport.top}px`;
  // A caret not placed yet appears in place rather than gliding in from the corner.
  if (glides && caret.style.translate !== "") {
    caret.dataset.animated = "";
    caret.style.translate = translate;
    return;
  }
  delete caret.dataset.animated;
  caret.style.translate = translate;
  // Read to commit the place before any glide is switched on: StrictMode calls the anchor's ref twice
  // in one task, and the browser would otherwise see a single change, from no place at all, and animate it.
  void getComputedStyle(caret).translate;
}

/**
 * Ref callback of the caret's anchor: scrolls the word list to the anchor's line, then glides the caret onto it.
 * Both in one place because the caret is placed in the word list's viewport, so it must be measured after the scroll.
 */
export function followCaret(anchor: HTMLElement | null) {
  placeCaret(anchor, true);
}

/** The same without the glide, for when the text moved under the caret rather than the caret through the text. */
export function snapCaret(anchor: HTMLElement | null) {
  placeCaret(anchor, false);
}
