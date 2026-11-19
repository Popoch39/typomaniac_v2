import { formatClock } from "../../../shared/lib/formatClock.ts";
import { useQueueStore } from "../store/useQueueStore.ts";

const WAITING = "You are in the Queue, looking for an Opponent.";
const REQUEUED = "Your Opponent did not accept. You are back in the Queue, with the time you had.";

export function useQueueWaiting() {
  const waitingSeconds = useQueueStore((state) => state.waitingSeconds);
  const isRequeued = useQueueStore((state) => state.isRequeued);
  const leave = useQueueStore((state) => state.leave);
  return {
    status: isRequeued ? REQUEUED : WAITING,
    waitingTime: formatClock(waitingSeconds),
    leave,
  };
}
