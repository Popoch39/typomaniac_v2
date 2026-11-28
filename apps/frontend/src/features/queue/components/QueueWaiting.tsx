import { Link } from "@tanstack/react-router";
import { Keycap } from "../../../shared/components/Keycap.tsx";
import { PracticeIcon } from "../../shell/components/PracticeIcon.tsx";
import { useQueueWaiting } from "../hooks/useQueueWaiting.ts";
import { LoadingPixels } from "../../../shared/components/LoadingPixels.tsx";
import { LeaveIcon } from "./LeaveIcon.tsx";

export function QueueWaiting() {
  const waiting = useQueueWaiting();

  if (waiting === null) return null;
  const { status, waitingTime, leave } = waiting;

  return (
    <div className="flex flex-1 flex-col justify-between gap-6">
      <div className="flex flex-col gap-3.5">
        <p className="m-0 type-card-title text-ink">Searching</p>
        <p
          role="timer"
          aria-label="Time waited in the Queue"
          className="m-0 type-metric-xl text-action"
        >
          {waitingTime}
        </p>
        <LoadingPixels />
        <p role="status" className="m-0 text-ink-muted">
          {status}
        </p>
      </div>
      <div className="flex flex-wrap gap-4 pb-2">
        <Keycap type="button" size="lg" onClick={leave}>
          <LeaveIcon />
          Leave
        </Keycap>
        {/* The Player keeps their place in the Queue while they train. */}
        <Keycap asChild size="lg">
          <Link to="/practice">
            <PracticeIcon />
            Practice while you wait
          </Link>
        </Keycap>
      </div>
    </div>
  );
}
