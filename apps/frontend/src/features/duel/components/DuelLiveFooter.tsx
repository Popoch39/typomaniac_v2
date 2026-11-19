import { useDuelLiveFooter } from "../hooks/useDuelLiveFooter.ts";
import { DuelLiveStat } from "./DuelLiveStat.tsx";
import { DuelWpmSparkline } from "./DuelWpmSparkline.tsx";

export function DuelLiveFooter() {
  const { self, opponent, sparkline } = useDuelLiveFooter();

  return (
    // A fixed height: the stats and the sparkline change every second without moving anything.
    <footer className="flex h-[34px] shrink-0 items-center justify-center gap-7">
      <DuelLiveStat stat={self} isOwn />
      <DuelWpmSparkline sparkline={sparkline} />
      <DuelLiveStat stat={opponent} />
    </footer>
  );
}
