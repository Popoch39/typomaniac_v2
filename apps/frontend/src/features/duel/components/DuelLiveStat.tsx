import { cn } from "../../../shared/lib/utils.ts";

interface DuelLiveStatProps {
  stat: {
    readonly name: string;
    readonly wpm: number;
    readonly accuracy: number;
  };
  isOwn?: boolean;
}

// Every figure has a slot as wide as its largest value, in monospaced figures, so that neither the
// text nor the sparkline next to it moves as the values grow.
export function DuelLiveStat({ stat, isOwn = false }: DuelLiveStatProps) {
  return (
    <p className="m-0 font-mono text-[15px] font-bold whitespace-pre text-ink-muted tabular-nums">
      <span className="sr-only">{stat.name}: </span>
      <span
        className={cn("inline-block w-[3ch] text-right", isOwn ? "text-action" : "text-opponent")}
      >
        {stat.wpm}
      </span>
      {" WPM · "}
      <span className="inline-block w-[4ch] text-left">{stat.accuracy}%</span>
    </p>
  );
}
