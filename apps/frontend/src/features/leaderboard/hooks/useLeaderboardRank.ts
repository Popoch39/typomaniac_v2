import { rankName } from "../../ranked/standing/rankName.ts";
import type { LeaderboardPlayer } from "./useLeaderboard.ts";

export function useLeaderboardRank({ rank }: LeaderboardPlayer) {
  return { name: rankName(rank) };
}
