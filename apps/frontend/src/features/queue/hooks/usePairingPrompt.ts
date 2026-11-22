import { formatClock } from "../../../shared/lib/formatClock.ts";
import { acceptSecondsLeft } from "../clock/acceptSecondsLeft.ts";
import { shownQueuePhase } from "../phase/queuePhase.ts";
import { useQueueStore } from "../store/useQueueStore.ts";

export function usePairingPrompt() {
  const phase = useQueueStore((state) => state.phase);
  // Read as whole seconds, so that the prompt renders once a second rather than at each refresh.
  const secondsLeft = useQueueStore(({ phase: current, now }) => {
    const shown = shownQueuePhase(current);
    return shown.kind === "proposed" ? acceptSecondsLeft(shown.window, now) : 0;
  });
  const accept = useQueueStore((state) => state.accept);
  const shown = shownQueuePhase(phase);
  if (shown.kind !== "proposed") return null;
  return {
    players: shown.players,
    timeLeft: formatClock(secondsLeft),
    drainedShare: shown.acceptSeconds === 0 ? 0 : secondsLeft / shown.acceptSeconds,
    isAccepted: shown.accepted,
    // Nothing reaches the server while the socket is reopened.
    canAccept: phase.kind === "proposed",
    accept,
  };
}
