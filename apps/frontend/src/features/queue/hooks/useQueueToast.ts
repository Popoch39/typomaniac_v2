import { useQueueLayer } from "./useQueueLayer.ts";
import { useQueueWaiting } from "./useQueueWaiting.ts";

export function useQueueToast() {
  const layer = useQueueLayer();
  const waiting = useQueueWaiting();
  const isShown = layer.kind === "searching";
  return {
    isShown,
    isDimmed: isShown && layer.isDimmed,
    // A notice takes the toast's place at once: sliding out, the toast would push it up the corner.
    isReplaced: layer.kind !== "none" && layer.kind !== "searching" && layer.kind !== "pairing",
    // Sliding out after the Queue was left, the toast keeps its frame with no time left to show.
    status: waiting?.status ?? "",
    waitingTime: waiting?.waitingTime ?? "",
    leave: waiting?.leave,
  };
}
