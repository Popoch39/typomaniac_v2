import { useKeyPresses } from "../hooks/useKeyPresses.ts";
import { useTypingFocus } from "../hooks/useTypingFocus.ts";
import { useTypingInput } from "../hooks/useTypingInput.ts";
import { FocusVeil } from "./FocusVeil.tsx";
import { WordList } from "./WordList.tsx";

export function TypingArea() {
  const inputRef = useTypingInput();
  const { onKeyDown, onKeyUp } = useKeyPresses();
  const { inputId, isFocused, onFocus, onBlur } = useTypingFocus();

  return (
    <div className="typing-area">
      <input
        ref={inputRef}
        id={inputId}
        className="typing-input"
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
      <WordList />
      {!isFocused && <FocusVeil inputId={inputId} />}
    </div>
  );
}
