import { queueNoticeOf } from "../notice/queueNoticeOf.ts";
import { isQueueNotice } from "../phase/queuePhase.ts";
import { useQueueStore } from "../store/useQueueStore.ts";

/** What the Player must be told about why they are not queued here, if anything. */
export function useQueueNotice() {
  const phase = useQueueStore((state) => state.phase);
  return isQueueNotice(phase) ? queueNoticeOf(phase) : null;
}
