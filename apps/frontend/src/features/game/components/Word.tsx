import { OpponentCaret } from "../../../shared/components/OpponentCaret.tsx";
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
    <span ref={scrollRef} className={isWrong ? "underline decoration-letter-incorrect" : undefined}>
      {Array.from({ length: letterCount }, (_, letterIndex) => (
        <Letter key={letterIndex} wordIndex={index} letterIndex={letterIndex} />
      ))}
      {hasCaretAtEnd && <Caret />}
      <OpponentCaret wordIndex={index} letterIndex={letterCount} />
    </span>
  );
}
