import { Panel } from "../../../shared/components/Panel.tsx";
import { cn } from "../../../shared/lib/utils.ts";
import { useWinRateTile } from "../hooks/useWinRateTile.ts";
import type { ProgressSummary } from "../summary/progressSummary.ts";
import { OutcomeBar } from "./OutcomeBar.tsx";
import { OutcomeCount } from "./OutcomeCount.tsx";

interface WinRateTileProps {
  summary: ProgressSummary;
  className?: string;
}

// Every line stays in its place whatever the counts, so that another period or kind moves nothing.
export function WinRateTile({ summary, className }: WinRateTileProps) {
  const { rate, lines } = useWinRateTile(summary);

  return (
    <Panel title="Win rate" className={cn("justify-between", className)}>
      <p className="m-0 type-metric-xl text-ink">{rate}</p>
      <OutcomeBar lines={lines} />
      <dl className="m-0 grid grid-cols-3 gap-4">
        {lines.map((line) => (
          <OutcomeCount key={line.outcome} {...line} />
        ))}
      </dl>
    </Panel>
  );
}
