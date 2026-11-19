import { cn } from "../../../shared/lib/utils.ts";
import { useCaretOnResize } from "../hooks/useCaretOnResize.ts";
import { useWordCount } from "../hooks/useWordCount.ts";
import { Caret } from "./Caret.tsx";
import { Word } from "./Word.tsx";

const fontSizes = {
  regular: "text-[24px]",
  large: "text-[34px] tracking-[.01em]",
} as const;

interface WordListProps {
  size: keyof typeof fontSizes;
}

export function WordList({ size }: WordListProps) {
  const wordCount = useWordCount();
  const resizeRef = useCaretOnResize();

  return (
    // The caret sits beside the scrolling list, not in it, so a line change scrolls the words under it.
    // Only the font size varies: the line height and the three lines are in em, so they follow it.
    // The line height comes after the font size, or tailwind-merge drops it as overridden by `text-*`.
    <div className={cn("relative font-mono", fontSizes[size], "leading-[1.8]")}>
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
