import type { ReactNode } from "react";
import type { Rank } from "@repo/ranked-engine";
import { TierBadge } from "../../ranked/components/TierBadge.tsx";
import { rankName } from "../../ranked/standing/rankName.ts";

interface RankLabelProps {
  rank: Rank;
  /** Shown under the Rank name. */
  children?: ReactNode;
}

export function RankLabel({ rank, children }: RankLabelProps) {
  return (
    <span className="flex items-center gap-3">
      <TierBadge tier={rank.tier} size="sm" />
      <span className="flex flex-col gap-1">
        <span className="type-tier-name text-ink">{rankName(rank)}</span>
        {children}
      </span>
    </span>
  );
}
