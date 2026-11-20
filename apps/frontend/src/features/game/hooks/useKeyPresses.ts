import type { KeyboardEvent } from "react";
import { eventTime } from "../clock/eventTime.ts";
import { type BrowserKey, translateKey } from "../input/translateKey.ts";
import { useBrowserHintsStore } from "../store/useBrowserHintsStore.ts";
import { useGameStore } from "../store/useGameStore.ts";

/** Key handlers for the hidden input: they feed the engine the KeyPresses behind Key consistency. */
export function useKeyPresses() {
  const applyEvent = useGameStore((state) => state.applyEvent);
  const countKey = useBrowserHintsStore((state) => state.countKey);

  const onKey = (type: BrowserKey["type"], event: KeyboardEvent<HTMLInputElement>) => {
    const gameEvent = translateKey({ type, code: event.code, repeat: event.repeat }, eventTime());
    if (gameEvent === null) return;
    if (gameEvent.type === "keyDown") countKey(event.isTrusted);
    applyEvent(gameEvent);
  };

  return {
    onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => onKey("keydown", event),
    onKeyUp: (event: KeyboardEvent<HTMLInputElement>) => onKey("keyup", event),
  };
}
