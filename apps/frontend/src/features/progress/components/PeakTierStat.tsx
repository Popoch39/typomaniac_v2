import type { Tier } from "@repo/ranked-engine";
import { TierBadge } from "../../ranked/components/TierBadge.tsx";

interface PeakTierStatProps {
  /** `unranked` before the Player's first Rank. */
  tier: Tier | "unranked";
  name: string;
}

// Of all time: the period and kind chosen leave it as it is.
export function PeakTierStat({ tier, name }: PeakTierStatProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <dt className="type-eyebrow text-ink-subtle">Peak Tier</dt>
      <dd className="m-0 flex items-center gap-3">
        <TierBadge tier={tier} size="sm" />
        <span className="type-tier-name text-ink">{name}</span>
      </dd>
    </div>
  );
}
