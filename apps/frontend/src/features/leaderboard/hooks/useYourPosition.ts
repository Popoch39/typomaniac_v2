import { useSignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import { yourPositionPanel } from "../own/yourPositionPanel.ts";
import type { LeaderboardPlayer } from "./useLeaderboard.ts";

export function useYourPosition(own: LeaderboardPlayer | null) {
  const { player } = useSignedInPlayer();
  return yourPositionPanel(own, player !== null);
}
