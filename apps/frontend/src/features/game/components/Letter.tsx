import { useLetter } from "../hooks/useLetter.ts";
import { Caret } from "./Caret.tsx";

type LetterProps = {
  wordIndex: number;
  letterIndex: number;
};

export function Letter({ wordIndex, letterIndex }: LetterProps) {
  const { char, state, hasCaretBefore } = useLetter(wordIndex, letterIndex);

  return (
    <>
      {hasCaretBefore && <Caret />}
      <span className={`letter letter-${state}`}>{char}</span>
    </>
  );
}
