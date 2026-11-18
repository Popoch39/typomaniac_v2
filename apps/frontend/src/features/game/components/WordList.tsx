import { useWordCount } from "../hooks/useWordCount.ts";
import { Word } from "./Word.tsx";

export function WordList() {
  const wordCount = useWordCount();

  return (
    <div className="word-list">
      {Array.from({ length: wordCount }, (_, index) => (
        <Word key={index} index={index} />
      ))}
    </div>
  );
}
