import { TierBadge } from "../../ranked/components/TierBadge.tsx";

export function UnrankedSummary() {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <TierBadge tier="unranked" size="lg" />
      <p className="m-0 type-rank-title text-ink">Unranked</p>
    </div>
  );
}
