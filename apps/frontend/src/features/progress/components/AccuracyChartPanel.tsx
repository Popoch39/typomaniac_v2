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
  /** What the period and the kind of Duels chosen cover. */
  tag: string;
  /** Said instead of empty axes while there is no Game. */
  emptyMessage: string;
}

export function AccuracyChartPanel({ rows, tag, emptyMessage }: AccuracyChartPanelProps) {
  return (
    <Panel title="Accuracy and Consistency" tag={tag}>
      <ProgressChart rows={rows} config={CONFIG} series={SERIES} emptyMessage={emptyMessage} />
    </Panel>
  );
}
