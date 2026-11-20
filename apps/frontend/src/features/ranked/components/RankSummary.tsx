import type { Rank } from "@repo/ranked-engine";
import { useRankSummary } from "../hooks/useRankSummary.ts";
import { LpBar } from "../../../shared/components/LpBar.tsx";
import { TierBadge } from "./TierBadge.tsx";

interface RankSummaryProps {
  rank: Rank;
}

export function RankSummary({ rank }: RankSummaryProps) {
  const { name, next } = useRankSummary(rank);

  return (
    <>
      <div className="flex flex-wrap items-center gap-6">
        <TierBadge tier={rank.tier} size="lg" />
        <div className="flex min-w-0 flex-col gap-2">
          <p className="m-0 type-rank-title text-ink">{name}</p>
          <p className="m-0 flex items-baseline gap-2 font-mono font-bold">
            <span className="type-metric-lg text-action">{rank.lp}</span>
            <span className="text-lg text-ink-muted">LP</span>
          </p>
        </div>
      </div>
      {/* As tall as the Placement pips and their hint, and kept at Master, so that the Rank card has one
          box whatever the Standing, the box its skeleton reserves. */}
      <div className="flex min-h-24 flex-col gap-3">
        {next !== null && (
          <>
            <LpBar lp={rank.lp} next={next} />
            <p className="m-0 text-sm text-ink-subtle">100 LP promote you to the next Division.</p>
          </>
        )}
      </div>
    </>
  );
}
