import type { AddFriendTarget } from "../../friends/relation/addFriendTarget.ts";
import type { Leaderboard } from "../hooks/useLeaderboard.ts";
import { AllRankedPlayers } from "./AllRankedPlayers.tsx";
import { LeaderboardPodium } from "./LeaderboardPodium.tsx";
import { YourPosition } from "./YourPosition.tsx";

interface LeaderboardSectionsProps {
  leaderboard: Leaderboard;
  addFriendOf: (nickname: string | null) => AddFriendTarget;
}

export function LeaderboardSections({ leaderboard, addFriendOf }: LeaderboardSectionsProps) {
  return (
    <>
      <LeaderboardPodium podium={leaderboard.podium} own={leaderboard.own} />
      <YourPosition own={leaderboard.own} />
      <AllRankedPlayers leaderboard={leaderboard} addFriendOf={addFriendOf} />
    </>
  );
}
