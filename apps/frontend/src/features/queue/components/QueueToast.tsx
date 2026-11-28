import { Link } from "@tanstack/react-router";
import { Keycap } from "../../../shared/components/Keycap.tsx";
import { cn } from "../../../shared/lib/utils.ts";
import { useQueueToast } from "../hooks/useQueueToast.ts";
import { LeaveIcon } from "./LeaveIcon.tsx";
import { QueueToastPanel } from "./QueueToastPanel.tsx";

/**
 * The Queue following the Player off the Ranked page, which its body leads back to. It stays mounted
 * so that it can slide out as well as in; dimming changes its opacity alone, never its place. Its slide
 * is shorter than the corner stack's gap, so that it never runs over the Challenge card below it.
 */
export function QueueToast() {
  const { isShown, isDimmed, isReplaced, searching, leave } = useQueueToast();

  return (
    <div
      inert={!isShown}
      className={cn(
        "starting:translate-y-4 starting:opacity-0",
        !isReplaced &&
          "transition-[translate,opacity,display] transition-discrete duration-200 ease-out motion-reduce:transition-none",
        isDimmed && "opacity-40",
        !isShown && "hidden translate-y-4 opacity-0",
      )}
    >
      <QueueToastPanel role="status" message={searching.status} isMessageHidden>
        <Link to="/ranked" className="flex min-w-0 flex-1 flex-col gap-1 text-ink no-underline">
          <span className="type-card-title">Searching</span>
          <span
            role="timer"
            aria-label="Time waited in the Queue"
            className="min-h-lh type-mono-sm text-action"
          >
            {searching.waitingTime}
          </span>
        </Link>
        <Keycap type="button" size="sm" onClick={leave}>
          <LeaveIcon />
          Leave
        </Keycap>
      </QueueToastPanel>
    </div>
  );
}
