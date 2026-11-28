import type { KeyboardEvent } from "react";
import { eventTime } from "../../game/clock/eventTime.ts";
import { acceptsPairing } from "../accept/acceptsPairing.ts";
import { shownQueuePhase } from "../phase/queuePhase.ts";
import { useQueueStore } from "../store/useQueueStore.ts";

// The Pairing is answered by accepting it or letting the time run out: the dialog never closes itself.
const keepOpen = (event: Event) => event.preventDefault();

// Enter and the Separator would press the Accept key natively once it holds the focus, past the guard.
const isPressingKey = (key: string) => key === "Enter" || key === " ";

const swallowPress = (event: KeyboardEvent) => {
  if (isPressingKey(event.key)) event.preventDefault();
};

export function usePairingDialog() {
  // The instant the store received the Pairing, on the same clock as the keys read against it.
  const shownAt = useQueueStore(({ phase }) => {
    const shown = shownQueuePhase(phase);
    return shown.kind === "proposed" ? shown.window.receivedAt : null;
  });
  const accept = useQueueStore((state) => state.accept);

  return {
    keepOpen,
    // The dialog itself takes the focus, not the Accept key, so that a key typed into the Practice
    // Game an instant earlier, Space or Enter, never presses it.
    focusDialog: (event: Event) => {
      event.preventDefault();
      if (event.currentTarget instanceof HTMLElement) event.currentTarget.focus();
    },
    // The typing area remounted as the prompt closed has taken the focus: it must keep it.
    keepFocus: (event: Event) => event.preventDefault(),
    acceptFromKey: (event: KeyboardEvent) => {
      swallowPress(event);
      if (shownAt !== null && acceptsPairing(event, eventTime() - shownAt)) accept();
    },
    swallowPress,
  };
}
