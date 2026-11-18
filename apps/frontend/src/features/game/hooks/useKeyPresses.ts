import type { KeyboardEvent } from "react";
import { eventTime } from "../clock/eventTime.ts";
import { type BrowserKey, translateKey } from "../input/translateKey.ts";
import { useGameStore } from "../store/useGameStore.ts";

/** Key handlers for the hidden input: they feed the engine the KeyPresses behind Key consistency. */
export function useKeyPresses() {
  const applyEvent = useGameStore((state) => state.applyEvent);

  const onKey = (type: BrowserKey["type"], event: KeyboardEvent<HTMLInputElement>) => {
    const gameEvent = translateKey({ type, code: event.code, repeat: event.repeat }, eventTime());
    if (gameEvent !== null) applyEvent(gameEvent);
  };

  return {
    onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => onKey("keydown", event),
    onKeyUp: (event: KeyboardEvent<HTMLInputElement>) => onKey("keyup", event),
  };
}
