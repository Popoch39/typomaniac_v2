import { useOpponentCaret } from "../hooks/useOpponentCaret.ts";

type OpponentCaretProps = {
  wordIndex: number;
  letterIndex: number;
};

export function OpponentCaret({ wordIndex, letterIndex }: OpponentCaretProps) {
  const name = useOpponentCaret(wordIndex, letterIndex);
  if (name === null) return null;

  return (
    // Drawn like the Participant's own caret, and positioned so that the Opponent's name can sit above it.
    <span className="relative -mr-[2px] inline-block h-[1.2em] w-[2px] bg-opponent align-text-bottom">
      <span className="absolute bottom-full left-0 text-[10px] leading-none whitespace-nowrap text-opponent">
        {name}
      </span>
    </span>
  );
}
