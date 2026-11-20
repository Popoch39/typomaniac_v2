import { Panel } from "../../../shared/components/Panel.tsx";
import { cn } from "../../../shared/lib/utils.ts";
import { useRankChartPanel } from "../hooks/useRankChartPanel.ts";
import type { RankPoint } from "../rank/rankChartRows.ts";
import { RankChart } from "./RankChart.tsx";
import { RankChartLegend } from "./RankChartLegend.tsx";

interface RankChartPanelProps {
  points: readonly RankPoint[];
  /** An Unranked Player has no Rank to draw until their Placement ends. */
  isUnranked: boolean;
  /** Said instead of empty axes while no Duel was played. */
  neverPlayedMessage: string;
  className?: string;
}

// The message takes the chart's height and the legend keeps its room, so that the Panel keeps one box
// with or without a curve.
export function RankChartPanel({
  points,
  isUnranked,
  neverPlayedMessage,
  className,
}: RankChartPanelProps) {
  const { rows, message } = useRankChartPanel(points, isUnranked, neverPlayedMessage);

  return (
    <Panel title="Rank" className={className}>
      <div className="flex flex-col gap-3">
        {message === null ? (
          <RankChart rows={rows} />
        ) : (
          <p className="m-0 flex h-64 items-center justify-center text-center text-ink-muted">
            {message}
          </p>
        )}
        <div className={cn(message !== null && "invisible")}>
          <RankChartLegend />
        </div>
      </div>
    </Panel>
  );
}
