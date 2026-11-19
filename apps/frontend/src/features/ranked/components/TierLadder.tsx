import type { Rank } from "@repo/ranked-engine";
import { cn } from "../../../shared/lib/utils.ts";
import { useTierLadder } from "../hooks/useTierLadder.ts";
import { TierBadge } from "./TierBadge.tsx";

interface TierLadderProps {
  rank: Rank | null;
}

export function TierLadder({ rank }: TierLadderProps) {
  const tiers = useTierLadder(rank);

  return (
    <section
      aria-label="Tiers"
      className="flex flex-col gap-4.5 rounded-3xl border-3 border-key-outline bg-surface-card p-6 text-ink"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 className="m-0 type-eyebrow text-ink-subtle">Tiers</h2>
        <p className="m-0 text-sm text-ink-subtle">
          Divisions IV to I in each Tier. Master has no Division.
        </p>
      </div>
      <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(140px,100%),1fr))] gap-3 p-0">
        {tiers.map(({ tier, name, isCurrent, line }) => (
          <li
            key={tier}
            aria-current={isCurrent ? "true" : undefined}
            className={cn(
              "flex flex-col items-center gap-2.5 rounded-xl border-2 px-2 pt-4 pb-3.5 text-center",
              isCurrent ? "border-action bg-key-face" : "border-key-outline bg-surface-plate",
            )}
          >
            <TierBadge tier={tier} size="sm" />
            <span className="type-tier-name text-ink">{name}</span>
            <span className={cn("type-mono-sm", isCurrent ? "text-action" : "text-ink-subtle")}>
              {line}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
