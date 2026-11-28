import { queueNoticeOf } from "../notice/queueNoticeOf.ts";
import type { QueueNoticePhase } from "../phase/queuePhase.ts";
import { useQueueStore } from "../store/useQueueStore.ts";

export function useQueueNoticeToast(notice: QueueNoticePhase) {
  const enter = useQueueStore((state) => state.enter);
  const dismiss = useQueueStore((state) => state.dismiss);
  return { ...queueNoticeOf(notice), enter, dismiss };
}
