import { formatWaitingTime } from "../clock/waitingSeconds.ts";
import { useQueueStore } from "../store/useQueueStore.ts";

export function useQueueWaiting() {
  const waitingSeconds = useQueueStore((state) => state.waitingSeconds);
  const leave = useQueueStore((state) => state.leave);
  return { waitingTime: formatWaitingTime(waitingSeconds), leave };
}
