import type { Tier } from "@repo/ranked-engine";
import { cn } from "../../../shared/lib/utils.ts";
import type { ProgressGame } from "../chart/progressChartRows.ts";
import type { RankPoint } from "../rank/rankChartRows.ts";
import { useProgressSection } from "../hooks/useProgressSection.ts";
import { AccuracyChartPanel } from "./AccuracyChartPanel.tsx";
import { PeakTierTile } from "./PeakTierTile.tsx";
import type { ProgressSummary } from "../summary/progressSummary.ts";
import { ProgressToolbar } from "./ProgressToolbar.tsx";
import { RankChartPanel } from "./RankChartPanel.tsx";
import { WinRateTile } from "./WinRateTile.tsx";
import { WpmChartPanel } from "./WpmChartPanel.tsx";

interface ProgressSectionProps {
  progress: {
    games: readonly ProgressGame[];
    /** The Duels of the same period and kind as `games`, by their Duel Outcome. */
    summary: ProgressSummary;
    rankPoints: readonly RankPoint[];
    /** Of all time, from the public Player read. */
    peakTier: Tier | null;
  };
  /** The Progress shown is the previous period's or kind's, while the chosen one is read. */
  isUpdating: boolean;
  /** Said instead of empty axes while no Duel was played. */
  emptyMessage: string;
  /** The Rank chart waits for the end of the Placement. */
  isUnranked: boolean;
}

// Every Panel stays drawn, even without a Game, so that choosing another period or kind moves nothing.
// A bento on a wide screen: the tiles stack beside the WPM chart, Accuracy and Rank share the row below;
// on a narrower one, the tiles share a row and each chart takes its own.
export function ProgressSection({
  progress: { games, summary, rankPoints, peakTier },
  isUpdating,
  emptyMessage,
  isUnranked,
}: ProgressSectionProps) {
  const section = useProgressSection(games, emptyMessage);

  return (
    <section aria-label="Progress" className="flex flex-col gap-7">
      <ProgressToolbar />
      <div
        aria-busy={isUpdating}
        className={cn(
          "grid grid-flow-row-dense grid-cols-2 gap-7 transition-opacity xl:grid-cols-6",
          isUpdating && "opacity-60",
        )}
      >
        <WinRateTile summary={summary} className="xl:col-span-2" />
        <WpmChartPanel {...section} className="col-span-2 xl:col-span-4 xl:row-span-2" />
        <PeakTierTile peakTier={peakTier} className="xl:col-span-2" />
        <AccuracyChartPanel {...section} className="col-span-2 xl:col-span-3" />
        <RankChartPanel
          points={rankPoints}
          isUnranked={isUnranked}
          neverPlayedMessage={emptyMessage}
          className="col-span-2 xl:col-span-3"
        />
      </div>
    </section>
  );
}
