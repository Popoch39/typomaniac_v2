import { Fragment } from "react";
import { useActiveWordScroll } from "../hooks/useActiveWordScroll.ts";
import { useWord } from "../hooks/useWord.ts";
import { Caret } from "./Caret.tsx";
import { Letter } from "./Letter.tsx";

type WordProps = {
  index: number;
};

export function Word({ index }: WordProps) {
  const { letters, hasCaretAtEnd, isWrong } = useWord(index);
  const scrollRef = useActiveWordScroll(index);

  return (
    <span ref={scrollRef} className={isWrong ? "word word-wrong" : "word"}>
      {letters.map((letter, letterIndex) => (
        <Fragment key={letterIndex}>
          {letter.hasCaretBefore && <Caret />}
          <Letter char={letter.char} state={letter.state} />
        </Fragment>
      ))}
      {hasCaretAtEnd && <Caret />}
    </span>
  );
}
