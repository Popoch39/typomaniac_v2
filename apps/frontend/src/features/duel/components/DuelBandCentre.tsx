import { cn } from "../../../shared/lib/utils.ts";
import { useDuelClock } from "../hooks/useDuelClock.ts";
import { useDuelRoundScore } from "../hooks/useDuelRoundScore.ts";
import { DuelRoundPips } from "./DuelRoundPips.tsx";

export function DuelBandCentre() {
  const roundScore = useDuelRoundScore();
  const clock = useDuelClock();

  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="flex items-baseline gap-5 font-mono text-[28px] leading-none xl:text-[36px] font-bold tabular-nums">
        <span className="text-ink">
          <span aria-hidden="true">{roundScore}</span>
          <span className="sr-only">Rounds {roundScore}</span>
        </span>
        <span className={cn(clock.isOver ? "text-ink-subtle" : "text-ink")}>
          <span aria-hidden="true">{clock.text}</span>
          <span className="sr-only">{clock.label}</span>
        </span>
      </div>
      <DuelRoundPips />
    </div>
  );
}
