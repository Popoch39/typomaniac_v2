import { useActiveWordScroll } from "../hooks/useActiveWordScroll.ts";
import { useWord } from "../hooks/useWord.ts";
import { Caret } from "./Caret.tsx";
import { Letter } from "./Letter.tsx";

type WordProps = {
  index: number;
};

export function Word({ index }: WordProps) {
  const { letterCount, hasCaretAtEnd, isWrong } = useWord(index);
  const scrollRef = useActiveWordScroll(index);

  return (
    <span ref={scrollRef} className={isWrong ? "word word-wrong" : "word"}>
      {Array.from({ length: letterCount }, (_, letterIndex) => (
        <Letter key={letterIndex} wordIndex={index} letterIndex={letterIndex} />
      ))}
      {hasCaretAtEnd && <Caret />}
    </span>
  );
}
