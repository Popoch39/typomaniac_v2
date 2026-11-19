import { usePlacementSummary } from "../hooks/usePlacementSummary.ts";
import { PlacementPips } from "./PlacementPips.tsx";
import { TierBadge } from "./TierBadge.tsx";

interface PlacementSummaryProps {
  placement: { readonly played: number; readonly total: number };
}

// The Rank stays hidden until the last Placement Duel: no Tier, no LP.
export function PlacementSummary({ placement }: PlacementSummaryProps) {
  const { hint } = usePlacementSummary(placement.played, placement.total);

  return (
    <>
      <div className="flex flex-wrap items-center gap-6">
        <TierBadge tier="unranked" size="lg" />
        <div className="flex min-w-0 flex-col gap-2">
          <p className="m-0 type-rank-title text-ink">Unranked</p>
          <p className="m-0 font-mono font-bold text-ink-muted">
            <span className="text-action">{placement.played}</span> of {placement.total} Placement
            Duels played
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3.5">
        <PlacementPips played={placement.played} total={placement.total} />
        <p className="m-0 text-sm text-ink-subtle">{hint}</p>
      </div>
    </>
  );
}
