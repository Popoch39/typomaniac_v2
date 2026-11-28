import { Link } from "@tanstack/react-router";
import { Keycap } from "../../../shared/components/Keycap.tsx";
import { Panel } from "../../../shared/components/Panel.tsx";
import { cn } from "../../../shared/lib/utils.ts";
import { useQueueToast } from "../hooks/useQueueToast.ts";
import { LeaveIcon } from "./LeaveIcon.tsx";

/**
 * The Queue following the Player off the Ranked page, which its body leads back to. It stays mounted
 * so that it can slide out as well as in; dimming changes its opacity alone, never its place.
 */
export function QueueToast() {
  const { isShown, isDimmed, status, waitingTime, leave } = useQueueToast();

  return (
    <div
      inert={!isShown}
      className={cn(
        "transition-[translate,opacity,display] transition-discrete duration-200 ease-out starting:translate-y-6 starting:opacity-0 motion-reduce:transition-none",
        isDimmed && "opacity-40",
        !isShown && "hidden translate-y-6 opacity-0",
      )}
    >
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
              className="min-h-lh type-mono-sm text-action"
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
    </div>
  );
}
