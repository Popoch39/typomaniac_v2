import { useKeyPresses } from "../hooks/useKeyPresses.ts";
import { useTypingFocus } from "../hooks/useTypingFocus.ts";
import { useTypingInput } from "../hooks/useTypingInput.ts";
import { FocusVeil } from "./FocusVeil.tsx";
import { LiveStatsBar } from "./LiveStatsBar.tsx";
import { WordList } from "./WordList.tsx";

export function TypingArea() {
  const inputRef = useTypingInput();
  const { onKeyDown, onKeyUp } = useKeyPresses();
  const { inputId, isFocused, onFocus, onBlur } = useTypingFocus();

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={inputId}
        // Kept focusable but invisible: the engine, not the input, holds the typed text.
        className="pointer-events-none absolute h-px w-px border-0 p-0 opacity-0"
        aria-label="Typing input"
        autoFocus
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      <LiveStatsBar />
      {/* The focus veil covers only the words, leaving the Live stats readable. */}
      <div className="relative">
        <WordList />
        {!isFocused && <FocusVeil inputId={inputId} />}
      </div>
    </div>
  );
}
