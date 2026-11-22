import { formatClock } from "../../../shared/lib/formatClock.ts";
import { waitingSeconds } from "../clock/waitingSeconds.ts";
import { shownQueuePhase } from "../phase/queuePhase.ts";
import { useQueueStore } from "../store/useQueueStore.ts";

const WAITING = "You are in the Queue, looking for an Opponent.";
const REQUEUED = "Your Opponent did not accept. You are back in the Queue, with the time you had.";

export function useQueueWaiting() {
  const phase = useQueueStore((state) => state.phase);
  // Read as whole seconds, so that the waiting time renders once a second rather than at each refresh.
  const seconds = useQueueStore(({ phase: current, now }) => {
    const shown = shownQueuePhase(current);
    return shown.kind === "queued" ? waitingSeconds(shown.entry, now) : 0;
  });
  const leave = useQueueStore((state) => state.leave);
  const shown = shownQueuePhase(phase);
  if (shown.kind !== "queued") return null;
  return {
    status: shown.requeued ? REQUEUED : WAITING,
    waitingTime: formatClock(seconds),
    leave,
  };
}
