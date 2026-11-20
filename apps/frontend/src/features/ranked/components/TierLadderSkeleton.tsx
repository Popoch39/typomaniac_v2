import { TIERS } from "@repo/ranked-engine";
import { SkeletonBlock } from "../../../shared/components/SkeletonBlock.tsx";
import { tierName } from "../standing/rankName.ts";

// The Tiers do not depend on the Standing: their names stay, and only the badge and the line that
// marks the Player's own Tier are recessed.
export function TierLadderSkeleton() {
  return (
    <section className="flex flex-col gap-4.5 rounded-3xl border-3 border-key-outline bg-surface-card p-6 text-ink">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 className="m-0 type-eyebrow text-ink-subtle">Tiers</h2>
        <p className="m-0 text-sm text-ink-subtle">
          Divisions IV to I in each Tier. Master has no Division.
        </p>
      </div>
      <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(140px,100%),1fr))] gap-3 p-0">
        {TIERS.map((tier) => (
          <li
            key={tier}
            className="flex flex-col items-center gap-2.5 rounded-xl border-2 border-key-outline bg-surface-plate px-2 pt-4 pb-3.5 text-center"
          >
            <SkeletonBlock className="size-14 rounded-sm" />
            <span className="type-tier-name text-ink">{tierName(tier)}</span>
            <SkeletonBlock className="h-lh w-16 type-mono-sm" />
          </li>
        ))}
      </ol>
    </section>
  );
}
