import { Panel } from "../../../shared/components/Panel.tsx";
import type { ProgressChartRow } from "../hooks/useProgressChartRows.ts";
import { ProgressChart } from "./ProgressChart.tsx";

const CONFIG = {
  accuracy: { label: "Accuracy", color: "var(--action)" },
  consistency: { label: "Consistency", color: "var(--brand)" },
};

const SERIES = [{ key: "accuracy" }, { key: "consistency" }] as const;

interface AccuracyChartPanelProps {
  rows: readonly ProgressChartRow[];
  /** Said instead of empty axes while there is no Game. */
  emptyMessage: string;
  className?: string;
}

export function AccuracyChartPanel({ rows, emptyMessage, className }: AccuracyChartPanelProps) {
  return (
    <Panel title="Accuracy and Consistency" className={className}>
      <ProgressChart
        rows={rows}
        config={CONFIG}
        series={SERIES}
        emptyMessage={emptyMessage}
        className="h-64"
      />
    </Panel>
  );
}
