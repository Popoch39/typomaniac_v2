import { useQueueStore } from "../store/useQueueStore.ts";

export function useQueueEntry() {
  const phase = useQueueStore((state) => state.phase);
  const enter = useQueueStore((state) => state.enter);
  return {
    enter,
    isQueued: phase === "queued",
    isProposed: phase === "proposed",
    isPaired: phase === "paired",
    isEntering: phase === "connecting",
  };
}
