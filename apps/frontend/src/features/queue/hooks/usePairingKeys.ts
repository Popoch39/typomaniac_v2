import type { KeyboardEvent } from "react";
import { useQueueStore } from "../store/useQueueStore.ts";

// Enter and the Separator would press the Accept key natively once it holds the focus, past the guard.
const isPressingKey = (key: string) => key === "Enter" || key === " ";

const blockNativePress = (event: KeyboardEvent) => {
  if (isPressingKey(event.key)) event.preventDefault();
};

/** The keys of the Pairing prompt, in the dialog or the Ranked panel: only Enter, guarded, accepts. */
export function usePairingKeys() {
  const press = useQueueStore((state) => state.press);
  return {
    acceptFromKey: (event: KeyboardEvent) => {
      blockNativePress(event);
      press(event);
    },
    blockNativePress,
  };
}
