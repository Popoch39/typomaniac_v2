import { OpponentCaret } from "../../../shared/components/OpponentCaret.tsx";
import { useLetter } from "../hooks/useLetter.ts";
import type { LetterState } from "../words/judgeLetter.ts";
import { CaretAnchor } from "./CaretAnchor.tsx";

const LETTER_CLASS: Record<LetterState, string> = {
  untyped: "text-muted-foreground",
  correct: "text-letter-correct",
  incorrect: "text-letter-incorrect",
  extra: "text-letter-extra",
  missed: "text-letter-incorrect",
};

type LetterProps = {
  wordIndex: number;
  letterIndex: number;
};

export function Letter({ wordIndex, letterIndex }: LetterProps) {
  const { char, state, hasCaretBefore } = useLetter(wordIndex, letterIndex);

  return (
    <>
      {hasCaretBefore && <CaretAnchor />}
      <OpponentCaret wordIndex={wordIndex} letterIndex={letterIndex} />
      <span className={LETTER_CLASS[state]}>{char}</span>
    </>
  );
}
