import { useQueueStore } from "../store/useQueueStore.ts";
import { useQueueLayer } from "./useQueueLayer.ts";
import { useQueueWaiting } from "./useQueueWaiting.ts";

// Sliding out after the Queue was left, the toast keeps its frame with no time left to show.
const NOTHING_WAITED = { status: "", waitingTime: "" } as const;

export function useQueueToast() {
  const layer = useQueueLayer();
  const waiting = useQueueWaiting();
  const leave = useQueueStore((state) => state.leave);
  const isShown = layer.kind === "searching";
  return {
    isShown,
    isDimmed: isShown && layer.isDimmed,
    // Entering again and a notice take the toast's place at once: sliding out, the toast would stay
    // over them in the corner.
    isReplaced: layer.kind === "entering" || layer.kind === "notice",
    searching: waiting ?? NOTHING_WAITED,
    leave,
  };
}
