import type { Rank } from "@repo/ranked-engine";
import { RankLabel } from "../../leaderboard/components/RankLabel.tsx";

interface PlayerRankProps {
  /** Null while Unranked. */
  rank: Rank | null;
}

export function PlayerRank({ rank }: PlayerRankProps) {
  if (rank === null) return <span className="type-tier-name text-ink-muted">Unranked</span>;
  return <RankLabel rank={rank} />;
}
