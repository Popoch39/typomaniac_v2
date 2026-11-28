import { FindDuelIcon } from "../../../shared/components/FindDuelIcon.tsx";
import { Keycap } from "../../../shared/components/Keycap.tsx";
import { useQueueNoticeToast } from "../hooks/useQueueNoticeToast.ts";
import type { QueueNoticePhase } from "../phase/queuePhase.ts";
import { QueueToastPanel } from "./QueueToastPanel.tsx";

interface QueueNoticeToastProps {
  notice: QueueNoticePhase;
}

/** Why the Player left the Queue off the Ranked page, shown until they close it or enter again. */
export function QueueNoticeToast({ notice }: QueueNoticeToastProps) {
  const { role, message, enter, dismiss } = useQueueNoticeToast(notice);

  return (
    <QueueToastPanel role={role} message={message}>
      <Keycap type="button" variant="brand" size="sm" onClick={enter}>
        <FindDuelIcon />
        Enter again
      </Keycap>
      <Keycap type="button" size="sm" onClick={dismiss}>
        Close
      </Keycap>
    </QueueToastPanel>
  );
}
