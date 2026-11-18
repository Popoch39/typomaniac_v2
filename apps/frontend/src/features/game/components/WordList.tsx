import { useWordCount } from "../hooks/useWordCount.ts";
import { Word } from "./Word.tsx";

export function WordList() {
  const wordCount = useWordCount();

  return (
    // Three lines tall; no row gap, so that a word's height is exactly one line to scroll by.
    <div className="relative flex h-[5.4em] flex-wrap gap-x-[0.6em] gap-y-0 overflow-hidden font-mono text-[24px] leading-[1.8]">
      {Array.from({ length: wordCount }, (_, index) => (
        <Word key={index} index={index} />
      ))}
    </div>
  );
}
