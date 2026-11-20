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
}

export function AccuracyChartPanel({ rows }: AccuracyChartPanelProps) {
  return (
    <Panel title="Accuracy and Consistency" tag="Last 20 Duels">
      <ProgressChart rows={rows} config={CONFIG} series={SERIES} />
    </Panel>
  );
}
