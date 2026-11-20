import { cn } from "../../../shared/lib/utils.ts";
import type { DuelOutcome, ProgressSummaryLine } from "../summary/progressSummary.ts";
import { OUTCOME_COLOR } from "./outcomeColor.ts";

interface OutcomeBarProps {
  lines: readonly ProgressSummaryLine[];
}

const SEGMENT_ORDER: readonly DuelOutcome[] = ["won", "drawn", "lost"];

/** The Duels of the period as one bar, each Duel Outcome taking its share; an empty track without any. */
export function OutcomeBar({ lines }: OutcomeBarProps) {
  return (
    <div
      aria-hidden
      className="flex h-4 w-full gap-0.5 overflow-hidden rounded-full border-2 border-key-outline bg-key-face"
    >
      {SEGMENT_ORDER.map((outcome) => {
        const count = lines.find((line) => line.outcome === outcome)?.count ?? 0;
        return (
          <div
            key={outcome}
            className={cn("h-full", OUTCOME_COLOR[outcome])}
            style={{ flexGrow: count }}
          />
        );
      })}
    </div>
  );
}
