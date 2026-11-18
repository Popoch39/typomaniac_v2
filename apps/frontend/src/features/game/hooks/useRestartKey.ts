import { isRestartKey } from "../input/isRestartKey.ts";
import { useGameStore } from "../store/useGameStore.ts";

/**
 * Ref callback for the game screen. Listens on the window, so Tab restarts on the Result too,
 * and in the capture phase, so Tab is stopped before any listener could turn it into an Event.
 */
export function useRestartKey() {
  const restart = useGameStore((state) => state.restart);

  return (screen: HTMLElement | null) => {
    if (screen === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (!isRestartKey({ code: event.code })) return;
      // Tab would otherwise move the focus away from the typing area.
      event.preventDefault();
      event.stopPropagation();
      if (event.type === "keydown" && !event.repeat) restart();
    };
    window.addEventListener("keydown", onKey, { capture: true });
    window.addEventListener("keyup", onKey, { capture: true });
    return () => {
      window.removeEventListener("keydown", onKey, { capture: true });
      window.removeEventListener("keyup", onKey, { capture: true });
    };
  };
}
