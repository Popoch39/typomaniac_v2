import { cn } from "../../../shared/lib/utils.ts";
import type { LiveSide } from "../points/livePoints.ts";

type DuelLiveSideProps = {
  readonly side: LiveSide & { readonly name: string | undefined };
  readonly className: string;
};

export function DuelLiveSide({ side, className }: DuelLiveSideProps) {
  return (
    // Points large, since they decide the Round; what they are made of smaller underneath.
    <div className="flex flex-col font-mono">
      <span className={cn("text-sm", className)}>{side.name}</span>
      <span className={cn("text-4xl font-medium tabular-nums", className)}>{side.points}</span>
      <span className="text-sm text-muted-foreground tabular-nums">
        {side.wpm} wpm · {side.accuracy}% acc
      </span>
    </div>
  );
}
