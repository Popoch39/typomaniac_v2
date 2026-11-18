import { useTypingInput } from "../hooks/useTypingInput.ts";
import { LiveStatsBar } from "./LiveStatsBar.tsx";
import { WordList } from "./WordList.tsx";

export function TypingArea() {
  const inputRef = useTypingInput();

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
      />
      <LiveStatsBar />
      <WordList />
    </div>
  );
}
