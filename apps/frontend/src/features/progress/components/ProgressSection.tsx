import { Panel } from "../../../shared/components/Panel.tsx";
import type { ProgressGame } from "../chart/progressChartRows.ts";
import { useProgressChartRows } from "../hooks/useProgressChartRows.ts";
import { AccuracyChartPanel } from "./AccuracyChartPanel.tsx";
import { WpmChartPanel } from "./WpmChartPanel.tsx";

interface ProgressSectionProps {
  games: readonly ProgressGame[];
  /** Said instead of empty axes while no Duel was played. */
  emptyMessage: string;
}

export function ProgressSection({ games, emptyMessage }: ProgressSectionProps) {
  const rows = useProgressChartRows(games);

  if (rows.length === 0) {
    return (
      <Panel title="Progress">
        <p className="m-0 text-ink-muted">{emptyMessage}</p>
      </Panel>
    );
  }
  return (
    <section aria-label="Progress" className="flex flex-col gap-7">
      <WpmChartPanel rows={rows} />
      <AccuracyChartPanel rows={rows} />
    </section>
  );
}
