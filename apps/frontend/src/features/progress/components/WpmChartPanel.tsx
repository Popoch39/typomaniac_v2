import { Panel } from "../../../shared/components/Panel.tsx";
import type { ProgressChartRow } from "../hooks/useProgressChartRows.ts";
import { ProgressChart } from "./ProgressChart.tsx";

const CONFIG = {
  wpm: { label: "WPM", color: "var(--action)" },
  rawWpm: { label: "Raw WPM", color: "var(--ink-subtle)" },
  averageWpm: { label: "Average of 10", color: "var(--brand)" },
};

const SERIES = [{ key: "rawWpm" }, { key: "wpm" }, { key: "averageWpm", isTrend: true }] as const;

interface WpmChartPanelProps {
  rows: readonly ProgressChartRow[];
  /** Said instead of empty axes while there is no Game. */
  emptyMessage: string;
}

export function WpmChartPanel({ rows, emptyMessage }: WpmChartPanelProps) {
  return (
    <Panel title="WPM">
      <ProgressChart rows={rows} config={CONFIG} series={SERIES} emptyMessage={emptyMessage} />
    </Panel>
  );
}
