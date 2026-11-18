import { useGameProgress } from "../hooks/useGameProgress.ts";
import { useLiveStats } from "../hooks/useLiveStats.ts";

export function LiveStatsBar() {
  const progress = useGameProgress();
  const { wpm, accuracy } = useLiveStats();

  return (
    <div className="live-stats-bar">
      <span className="live-stats-progress">{progress}</span>
      <span>{wpm} wpm</span>
      <span>{accuracy}% acc</span>
    </div>
  );
}
