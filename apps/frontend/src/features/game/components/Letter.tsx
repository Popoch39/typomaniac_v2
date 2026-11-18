import { OpponentCaret } from "../../../shared/components/OpponentCaret.tsx";
import { useLetter } from "../hooks/useLetter.ts";
import type { LetterState } from "../words/judgeLetter.ts";
import { Caret } from "./Caret.tsx";

const LETTER_CLASS: Record<LetterState, string> = {
  untyped: "text-muted-foreground",
  correct: "text-foreground",
  incorrect: "text-letter-incorrect",
  extra: "text-letter-extra",
};

type LetterProps = {
  wordIndex: number;
  letterIndex: number;
};

export function Letter({ wordIndex, letterIndex }: LetterProps) {
  const { char, state, hasCaretBefore } = useLetter(wordIndex, letterIndex);

  return (
    <>
      {hasCaretBefore && <Caret />}
      <OpponentCaret wordIndex={wordIndex} letterIndex={letterIndex} />
      <span className={LETTER_CLASS[state]}>{char}</span>
    </>
  );
}
