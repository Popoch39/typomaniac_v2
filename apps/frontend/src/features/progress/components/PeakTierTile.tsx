import type { Tier } from "@repo/ranked-engine";
import { Panel } from "../../../shared/components/Panel.tsx";
import { TierBadge } from "../../ranked/components/TierBadge.tsx";
import { usePeakTierTile } from "../hooks/usePeakTierTile.ts";

interface PeakTierTileProps {
  peakTier: Tier | null;
  className?: string;
}

// Of all time: the period and kind chosen leave it as it is.
export function PeakTierTile({ peakTier, className }: PeakTierTileProps) {
  const { badge, name } = usePeakTierTile(peakTier);

  return (
    <Panel title="Peak Tier" className={className}>
      <div className="flex flex-1 items-center gap-6">
        <TierBadge tier={badge} size="lg" />
        <p className="m-0 type-tier-name text-ink">{name}</p>
      </div>
    </Panel>
  );
}
