import { useOpponentCaret } from "../hooks/useOpponentCaret.ts";

type OpponentCaretProps = {
  wordIndex: number;
  letterIndex: number;
};

export function OpponentCaret({ wordIndex, letterIndex }: OpponentCaretProps) {
  const name = useOpponentCaret(wordIndex, letterIndex);
  if (name === null) return null;

  return (
    <span className="caret caret-opponent">
      <span className="caret-opponent-name">{name}</span>
    </span>
  );
}
