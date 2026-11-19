import { PlayerAvatar } from "./PlayerAvatar.tsx";
import { useOpponentCaret } from "../hooks/useOpponentCaret.ts";
import { caretClassName } from "../lib/caretClassName.ts";

type OpponentCaretProps = {
  wordIndex: number;
  letterIndex: number;
};

export function OpponentCaret({ wordIndex, letterIndex }: OpponentCaretProps) {
  const opponent = useOpponentCaret(wordIndex, letterIndex);
  if (opponent === null) return null;

  return (
    // Drawn like the Participant's own caret, and positioned so that the Opponent's Avatar can sit above it.
    <span className={`${caretClassName} relative bg-opponent`}>
      {/* Lowered onto the caret's top so that it fits in the line's top leading, about 10px above the caret: a
          full 16px above it would reach into the line above and be cut off by the word list on the first line. */}
      <PlayerAvatar
        player={{ nickname: opponent.name, avatarUrl: opponent.avatarUrl }}
        className="absolute bottom-[calc(100%-7px)] left-1/2 size-4 -translate-x-1/2 rounded-full text-[8px] [--keycap-border:1px] [--keycap-depth:1px]"
      />
    </span>
  );
}
