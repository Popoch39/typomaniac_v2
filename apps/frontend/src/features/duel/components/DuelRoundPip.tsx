import type { RoundPipState } from "../round/roundPips.ts";
import { cn } from "../../../shared/lib/utils.ts";

const pipColours = {
  won: "bg-action",
  lost: "bg-opponent",
  drawn: "bg-ink-subtle",
  current: "border-brand bg-surface-plate",
  upcoming: "bg-surface-plate",
} as const;

interface DuelRoundPipProps {
  state: RoundPipState;
}

export function DuelRoundPip({ state }: DuelRoundPipProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("block size-3.5 rounded-[4px] border-2 border-key-outline", pipColours[state])}
    />
  );
}
