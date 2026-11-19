import { useSignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import { ownPosition } from "../own/ownPosition.ts";
import type { LeaderboardPlayer } from "./useLeaderboard.ts";

export function useYourPosition(own: LeaderboardPlayer | null) {
  const { player } = useSignedInPlayer();
  return ownPosition(own, player !== null);
}
