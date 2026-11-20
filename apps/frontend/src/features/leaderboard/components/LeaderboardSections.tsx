import type { Leaderboard } from "../hooks/useLeaderboard.ts";
import { AllRankedPlayers } from "./AllRankedPlayers.tsx";
import { LeaderboardPodium } from "./LeaderboardPodium.tsx";
import { YourPosition } from "./YourPosition.tsx";

interface LeaderboardSectionsProps {
  leaderboard: Leaderboard;
}

export function LeaderboardSections({ leaderboard }: LeaderboardSectionsProps) {
  return (
    <>
      <LeaderboardPodium podium={leaderboard.podium} own={leaderboard.own} />
      <YourPosition own={leaderboard.own} />
      <AllRankedPlayers leaderboard={leaderboard} />
    </>
  );
}
