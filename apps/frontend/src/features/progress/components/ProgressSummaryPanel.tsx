import type { Tier } from "@repo/ranked-engine";
import { Panel } from "../../../shared/components/Panel.tsx";
import { useProgressSummaryPanel } from "../hooks/useProgressSummaryPanel.ts";
import type { ProgressSummary } from "../summary/progressSummary.ts";
import { PeakTierStat } from "./PeakTierStat.tsx";
import { SummaryStat } from "./SummaryStat.tsx";

interface ProgressSummaryPanelProps {
  summary: ProgressSummary;
  peakTier: Tier | null;
}

// Every stat stays in its cell whatever the counts, so that another period or kind moves nothing.
export function ProgressSummaryPanel({ summary, peakTier }: ProgressSummaryPanelProps) {
  const { lines, peakTierBadge, peakTierName } = useProgressSummaryPanel(summary, peakTier);

  return (
    <Panel title="Summary">
      <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(min(132px,100%),1fr))] gap-x-6 gap-y-5">
        {lines.map(({ label, value }) => (
          <SummaryStat key={label} label={label} value={value} />
        ))}
        <PeakTierStat tier={peakTierBadge} name={peakTierName} />
      </dl>
    </Panel>
  );
}
