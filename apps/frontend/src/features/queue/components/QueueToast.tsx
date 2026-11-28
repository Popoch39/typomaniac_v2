import { Link } from "@tanstack/react-router";
import { Keycap } from "../../../shared/components/Keycap.tsx";
import { Panel } from "../../../shared/components/Panel.tsx";
import { useQueueWaiting } from "../hooks/useQueueWaiting.ts";
import { LeaveIcon } from "./LeaveIcon.tsx";

/** The Queue following the Player off the Ranked page, which its body leads back to. */
export function QueueToast() {
  const waiting = useQueueWaiting();

  if (waiting === null) return null;
  const { status, waitingTime, leave } = waiting;

  return (
    <Panel title="Queue" className="pointer-events-auto gap-4 p-5">
      <p role="status" className="sr-only">
        {status}
      </p>
      <div className="flex items-center gap-4 pb-1">
        <Link to="/ranked" className="flex min-w-0 flex-1 flex-col gap-1 text-ink no-underline">
          <span className="type-card-title">Searching</span>
          <span
            role="timer"
            aria-label="Time waited in the Queue"
            className="type-mono-sm text-action"
          >
            {waitingTime}
          </span>
        </Link>
        <Keycap type="button" size="sm" onClick={leave}>
          <LeaveIcon />
          Leave
        </Keycap>
      </div>
    </Panel>
  );
}
