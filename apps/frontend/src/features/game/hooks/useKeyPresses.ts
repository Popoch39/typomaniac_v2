import type { KeyboardEvent } from "react";
import { type BrowserKey, translateKey } from "../input/translateInput.ts";
import { useGameStore } from "../store/useGameStore.ts";

/** Key handlers for the hidden input: they feed the engine the KeyPresses behind Key consistency. */
export function useKeyPresses() {
  const applyEvent = useGameStore((state) => state.applyEvent);

  const onKey = (type: BrowserKey["type"], event: KeyboardEvent<HTMLInputElement>) => {
    // Monotonic and sub-millisecond, in epoch milliseconds so a server can bound it against receipt.
    const at = performance.timeOrigin + performance.now();
    const gameEvent = translateKey({ type, code: event.code, repeat: event.repeat }, at);
    if (gameEvent !== null) applyEvent(gameEvent);
  };

  return {
    onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => onKey("keydown", event),
    onKeyUp: (event: KeyboardEvent<HTMLInputElement>) => onKey("keyup", event),
  };
}
