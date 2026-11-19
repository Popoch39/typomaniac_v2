import type { LeaderboardPlayer } from "./useLeaderboard.ts";
import { usePagePositions } from "./usePagePositions.ts";

export function useAroundYouCaption(around: LeaderboardPlayer[]) {
  const positions = usePagePositions(around);
  return positions === null ? "Around you" : `Around you · ${positions}`;
}
