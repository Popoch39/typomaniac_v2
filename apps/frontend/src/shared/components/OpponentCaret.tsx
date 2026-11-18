import { useOpponentCaret } from "../hooks/useOpponentCaret.ts";
import { caretClassName } from "../lib/caretClassName.ts";

type OpponentCaretProps = {
  wordIndex: number;
  letterIndex: number;
};

export function OpponentCaret({ wordIndex, letterIndex }: OpponentCaretProps) {
  const name = useOpponentCaret(wordIndex, letterIndex);
  if (name === null) return null;

  return (
    // Drawn like the Participant's own caret, and positioned so that the Opponent's name can sit above it.
    <span className={`${caretClassName} relative bg-opponent`}>
      {/* Lowered by the name's descent so its letters fit in the line's top leading: a full 10px box above
          the caret would reach into the line above and be cut off by the word list on the first line. */}
      <span className="absolute bottom-[calc(100%-2px)] left-0 text-[10px] leading-none whitespace-nowrap text-opponent">
        {name}
      </span>
    </span>
  );
}
