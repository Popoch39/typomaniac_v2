import { useLpBar } from "../hooks/useLpBar.ts";

interface LpBarProps {
  lp: number;
  /** The Rank the LP climb toward. */
  next: string;
}

export function LpBar({ lp, next }: LpBarProps) {
  const { held, max, toNext, cellFills, valueText } = useLpBar(lp, next);

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
        {cellFills.map((fill, index) => (
          <span
            key={index}
            className="block h-5.5 overflow-hidden rounded-xs border-2 border-key-outline bg-key-edge"
          >
            <span className="block h-full bg-action" style={{ width: `${fill * 100}%` }} />
          </span>
        ))}
      </div>
    </div>
  );
}
