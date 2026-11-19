import { cn } from "../lib/utils.ts";
import { useLpBar } from "../hooks/useLpBar.ts";

interface LpBarProps {
  lp: number;
  /** The Rank the LP climb toward. */
  next: string;
  /** The LP held before, for the bar to sweep from as it appears. */
  from?: number;
  /** Keeps the bar at `from` until released, while something covers it. */
  isSweepHeld?: boolean;
}

export function LpBar({ lp, next, from, isSweepHeld = false }: LpBarProps) {
  const { held, max, toNext, cells, valueText } = useLpBar(lp, next, from);

  return (
    <div className="flex flex-col gap-3">
      <div
        aria-hidden="true"
        className="flex justify-between gap-3 font-mono text-[13px] font-bold text-ink-subtle"
      >
        <span>
          {held} / {max} LP
        </span>
        <span>
          {toNext} LP to <span className="text-ink">{next}</span>
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`LP toward ${next}`}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={held}
        aria-valuetext={valueText}
        className="grid grid-cols-10 gap-1.25"
      >
        {cells.map(({ isSwept, style }, index) => (
          <span
            key={index}
            className="block h-5.5 overflow-hidden rounded-xs border-2 border-key-outline bg-key-edge"
          >
            <span
              className={cn(
                "block h-full bg-action",
                isSwept && "lp-sweep",
                isSwept && isSweepHeld && "[animation-play-state:paused]",
              )}
              style={style}
            />
          </span>
        ))}
      </div>
    </div>
  );
}
