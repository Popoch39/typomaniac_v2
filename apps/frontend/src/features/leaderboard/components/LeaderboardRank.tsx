import type { LeaderboardPlayer } from "../hooks/useLeaderboard.ts";
import { useLeaderboardRank } from "../hooks/useLeaderboardRank.ts";

interface LeaderboardRankProps {
  player: LeaderboardPlayer;
}

export function LeaderboardRank({ player }: LeaderboardRankProps) {
  const { name, lp } = useLeaderboardRank(player);
  return (
    <>
      {name} · {lp}
    </>
  );
}
