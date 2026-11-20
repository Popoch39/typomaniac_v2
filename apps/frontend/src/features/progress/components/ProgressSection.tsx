import type { Tier } from "@repo/ranked-engine";
import { cn } from "../../../shared/lib/utils.ts";
import type { ProgressGame } from "../chart/progressChartRows.ts";
import type { RankPoint } from "../rank/rankChartRows.ts";
import { useProgressSection } from "../hooks/useProgressSection.ts";
import { AccuracyChartPanel } from "./AccuracyChartPanel.tsx";
import type { ProgressSummary } from "../summary/progressSummary.ts";
import { ProgressSummaryPanel } from "./ProgressSummaryPanel.tsx";
import { ProgressToolbar } from "./ProgressToolbar.tsx";
import { RankChartPanel } from "./RankChartPanel.tsx";
import { WpmChartPanel } from "./WpmChartPanel.tsx";

interface ProgressSectionProps {
  games: readonly ProgressGame[];
  /** The Duels of the same period and kind as `games`, by their Duel Outcome. */
  summary: ProgressSummary;
  /** Of all time, from the public Player read. */
  peakTier: Tier | null;
  /** The Games shown are the previous period's or kind's, while the chosen one is read. */
  isUpdating: boolean;
  /** Said instead of empty axes while no Duel was played. */
  emptyMessage: string;
  rankPoints: readonly RankPoint[];
  /** The Rank chart waits for the end of the Placement. */
  isUnranked: boolean;
}

// Every Panel stays drawn, even without a Game, so that choosing another period or kind moves nothing.
export function ProgressSection({
  games,
  summary,
  peakTier,
  isUpdating,
  emptyMessage,
  rankPoints,
  isUnranked,
}: ProgressSectionProps) {
  const section = useProgressSection(games, emptyMessage);

  return (
    <section aria-label="Progress" className="flex flex-col gap-7">
      <ProgressToolbar />
      <div
        aria-busy={isUpdating}
        className={cn("flex flex-col gap-7 transition-opacity", isUpdating && "opacity-60")}
      >
        <ProgressSummaryPanel summary={summary} peakTier={peakTier} />
        <WpmChartPanel {...section} />
        <AccuracyChartPanel {...section} />
        <RankChartPanel
          points={rankPoints}
          isUnranked={isUnranked}
          neverPlayedMessage={emptyMessage}
        />
      </div>
    </section>
  );
}
