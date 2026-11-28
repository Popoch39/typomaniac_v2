import { FindDuelIcon } from "../../../shared/components/FindDuelIcon.tsx";
import { Keycap } from "../../../shared/components/Keycap.tsx";
import { Panel } from "../../../shared/components/Panel.tsx";
import { useQueueNoticeToast } from "../hooks/useQueueNoticeToast.ts";
import type { QueueNoticePhase } from "../phase/queuePhase.ts";

interface QueueNoticeToastProps {
  notice: QueueNoticePhase;
}

/** Why the Player left the Queue off the Ranked page, shown until they close it or enter again. */
export function QueueNoticeToast({ notice }: QueueNoticeToastProps) {
  const { role, message, enter, dismiss } = useQueueNoticeToast(notice);

  return (
    <Panel title="Queue" className="pointer-events-auto gap-4 p-5">
      <p role={role} className="m-0 text-sm text-pretty text-ink">
        {message}
      </p>
      <div className="flex gap-3 pb-1">
        <Keycap type="button" variant="brand" size="sm" onClick={enter}>
          <FindDuelIcon />
          Enter again
        </Keycap>
        <Keycap type="button" size="sm" onClick={dismiss}>
          Close
        </Keycap>
      </div>
    </Panel>
  );
}
