import { useKeyPresses } from "../hooks/useKeyPresses.ts";
import { useTypingInput } from "../hooks/useTypingInput.ts";
import { LiveStatsBar } from "./LiveStatsBar.tsx";
import { WordList } from "./WordList.tsx";

export function TypingArea() {
  const inputRef = useTypingInput();
  const { onKeyDown, onKeyUp } = useKeyPresses();

  return (
    <div className="typing-area">
      <input
        ref={inputRef}
        className="typing-input"
        aria-label="Typing input"
        autoFocus
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
      />
      <LiveStatsBar />
      <WordList />
    </div>
  );
}
