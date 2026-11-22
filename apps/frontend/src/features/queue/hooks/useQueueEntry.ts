import { shownQueuePhase } from "../phase/queuePhase.ts";
import { useQueueStore } from "../store/useQueueStore.ts";

export function useQueueEntry() {
  const shown = useQueueStore((state) => shownQueuePhase(state.phase).kind);
  const enter = useQueueStore((state) => state.enter);
  return { enter, shown };
}
