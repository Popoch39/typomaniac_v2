import { useCaretOnResize } from "../hooks/useCaretOnResize.ts";
import { useWordCount } from "../hooks/useWordCount.ts";
import { Caret } from "./Caret.tsx";
import { Word } from "./Word.tsx";

export function WordList() {
  const wordCount = useWordCount();
  const resizeRef = useCaretOnResize();

  return (
    // The caret sits beside the scrolling list, not in it, so a line change scrolls the words under it.
    <div className="relative font-mono text-[24px] leading-[1.8]">
      {/* Three lines tall; no row gap, so that a word's height is exactly one line to scroll by. */}
      <div
        ref={resizeRef}
        className="relative flex h-[5.4em] flex-wrap gap-x-[0.6em] gap-y-0 overflow-hidden"
      >
        {Array.from({ length: wordCount }, (_, index) => (
          <Word key={index} index={index} />
        ))}
      </div>
      <Caret />
    </div>
  );
}
