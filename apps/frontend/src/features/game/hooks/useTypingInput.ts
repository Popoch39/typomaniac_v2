import { translateInput } from "../input/translateInput.ts";
import { useGameStore } from "../store/useGameStore.ts";

/**
 * Browsers fire no `beforeinput` for Backspace on an empty input, so the input always holds
 * this character, before the caret, for a deletion to have something to delete.
 */
const SENTINEL = " ";

function placeCaretAfterSentinel(input: HTMLInputElement) {
  input.value = SENTINEL;
  input.setSelectionRange(SENTINEL.length, SENTINEL.length);
}

/**
 * Ref callback for the hidden input. React's synthetic `onBeforeInput` is not the native
 * `beforeinput` event and carries no input type, so the native listener is attached here.
 */
export function useTypingInput() {
  const applyEvent = useGameStore((state) => state.applyEvent);

  return (input: HTMLInputElement | null) => {
    if (input === null) return;
    placeCaretAfterSentinel(input);
    const onFocus = () => placeCaretAfterSentinel(input);
    const onBeforeInput = (event: InputEvent) => {
      // The engine holds the typed text, so the input itself must stay empty.
      event.preventDefault();
      // Monotonic and sub-millisecond, in epoch milliseconds so a server can bound it against receipt.
      const at = performance.timeOrigin + performance.now();
      const gameEvent = translateInput({ inputType: event.inputType, data: event.data }, at);
      if (gameEvent !== null) applyEvent(gameEvent);
    };
    input.addEventListener("beforeinput", onBeforeInput);
    input.addEventListener("focus", onFocus);
    return () => {
      input.removeEventListener("beforeinput", onBeforeInput);
      input.removeEventListener("focus", onFocus);
    };
  };
}
