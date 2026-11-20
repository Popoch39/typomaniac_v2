import { cn } from "../../../shared/lib/utils.ts";
import type { ProgressSummaryLine } from "../summary/progressSummary.ts";
import { OUTCOME_COLOR } from "./outcomeColor.ts";

export function OutcomeCount({ outcome, label, count }: ProgressSummaryLine) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <dt className="flex items-center gap-2 type-eyebrow text-ink-subtle">
        <span
          aria-hidden
          className={cn("size-2.5 shrink-0 rounded-full", OUTCOME_COLOR[outcome])}
        />
        {label}
      </dt>
      <dd className="m-0 type-metric-lg text-ink tabular-nums">{count}</dd>
    </div>
  );
}
