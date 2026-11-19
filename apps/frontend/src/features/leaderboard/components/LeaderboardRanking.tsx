import type { Leaderboard } from "../hooks/useLeaderboard.ts";
import { useRankedCount } from "../hooks/useRankedCount.ts";
import { LeaderboardPagination } from "./LeaderboardPagination.tsx";
import { LeaderboardTable } from "./LeaderboardTable.tsx";

interface LeaderboardRankingProps {
  leaderboard: Leaderboard;
}

// While the Podium holds every ranked Player, there is no table to page through.
export function LeaderboardRanking({ leaderboard }: LeaderboardRankingProps) {
  const count = useRankedCount(leaderboard.total);

  return (
    <section aria-labelledby="ranking-title" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 id="ranking-title" className="m-0 type-section-title font-normal text-ink">
          All ranked Players
        </h2>
        <span className="type-eyebrow text-ink-subtle">{count}</span>
      </div>
      {leaderboard.players.length > 0 && (
        <>
          <LeaderboardTable
            players={leaderboard.players}
            own={leaderboard.own}
            around={leaderboard.around}
          />
          <LeaderboardPagination leaderboard={leaderboard} />
        </>
      )}
    </section>
  );
}
