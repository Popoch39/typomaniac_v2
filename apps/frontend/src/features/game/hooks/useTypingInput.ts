import { eventTime } from "../clock/eventTime.ts";
import { translateInput } from "../input/translateInput.ts";
import { useBrowserHintsStore } from "../store/useBrowserHintsStore.ts";
import { useGameStore } from "../store/useGameStore.ts";

/**
 * The input always holds this character, before the caret, so that a deletion has a target
 * whether or not the browser fires `beforeinput` on an empty input.
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
  const countKey = useBrowserHintsStore((state) => state.countKey);

  return (input: HTMLInputElement | null) => {
    if (input === null) return;
    placeCaretAfterSentinel(input);
    const onFocus = () => placeCaretAfterSentinel(input);
    // Composition cannot be cancelled, so its text lands in the input and must be cleared after it.
    const onCompositionEnd = () => placeCaretAfterSentinel(input);
    const onBeforeInput = (event: InputEvent) => {
      // The engine holds the typed text, so the input itself must stay empty.
      event.preventDefault();
      const gameEvent = translateInput(
        { inputType: event.inputType, data: event.data },
        eventTime(),
      );
      if (gameEvent === null) return;
      // A script can type without a single key going down: its input counts as a key it generated.
      countKey(event.isTrusted);
      applyEvent(gameEvent);
    };
    input.addEventListener("beforeinput", onBeforeInput);
    input.addEventListener("focus", onFocus);
    input.addEventListener("compositionend", onCompositionEnd);
    return () => {
      input.removeEventListener("beforeinput", onBeforeInput);
      input.removeEventListener("focus", onFocus);
      input.removeEventListener("compositionend", onCompositionEnd);
    };
  };
}
