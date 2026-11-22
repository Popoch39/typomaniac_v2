import type { AddFriendTarget } from "../../friends/relation/addFriendTarget.ts";
import type { Leaderboard } from "../hooks/useLeaderboard.ts";
import { rankedCount } from "../page/rankedCount.ts";
import { LeaderboardPagination } from "./LeaderboardPagination.tsx";
import { LeaderboardTable } from "./LeaderboardTable.tsx";
import { SectionHeader } from "./SectionHeader.tsx";

interface AllRankedPlayersProps {
  leaderboard: Leaderboard;
  addFriendOf: (nickname: string | null) => AddFriendTarget;
}

// While the Podium holds every ranked Player, there is no table to page through.
export function AllRankedPlayers({ leaderboard, addFriendOf }: AllRankedPlayersProps) {
  const count = rankedCount(leaderboard.total);

  return (
    <section aria-labelledby="all-players-title" className="flex flex-col gap-5">
      <SectionHeader titleId="all-players-title" title="All ranked Players" aside={count} />
      {leaderboard.players.length > 0 && (
        <>
          <LeaderboardTable
            players={leaderboard.players}
            own={leaderboard.own}
            around={leaderboard.around}
            addFriendOf={addFriendOf}
          />
          <LeaderboardPagination leaderboard={leaderboard} />
        </>
      )}
    </section>
  );
}
