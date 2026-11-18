import { useGameProgress } from "../hooks/useGameProgress.ts";
import { useLiveStats } from "../hooks/useLiveStats.ts";

export function LiveStatsBar() {
  const progress = useGameProgress();
  const { wpm, accuracy } = useLiveStats();

  return (
    <div className="mb-2 flex gap-6 font-mono text-muted-foreground">
      <span className="text-primary">{progress}</span>
      <span>{wpm} wpm</span>
      <span>{accuracy}% acc</span>
    </div>
  );
}
