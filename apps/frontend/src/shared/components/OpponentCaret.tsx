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
    // Drawn like the Participant's own caret, but left unpositioned so that the Avatar is placed against the word.
    <span className={`${caretClassName} bg-opponent`}>
      {/* Pinned to the word's top, which is the line's top, rather than hung above the caret: how far the caret
          sits below the line's top depends on the font's metrics, and an Avatar reaching above the line is cut
          off by the word list on the first line. No `left`, so it stays where the caret is; centred on it. */}
      <PlayerAvatar
        player={{ nickname: opponent.name, avatarUrl: opponent.avatarUrl }}
        className="absolute top-0 -ml-[7px] size-4 rounded-full text-[8px] [--keycap-border:1px] [--keycap-depth:1px]"
      />
    </span>
  );
}
