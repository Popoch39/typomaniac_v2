import { Fragment } from "react";
import { useWord } from "../hooks/useWord.ts";
import { Caret } from "./Caret.tsx";
import { Letter } from "./Letter.tsx";

type WordProps = {
  index: number;
};

export function Word({ index }: WordProps) {
  const { letters, caretIndex } = useWord(index);

  return (
    <span className="word">
      {letters.map((letter, letterIndex) => (
        <Fragment key={letterIndex}>
          {letterIndex === caretIndex && <Caret />}
          <Letter char={letter.char} state={letter.state} />
        </Fragment>
      ))}
      {caretIndex === letters.length && <Caret />}
    </span>
  );
}
