import { useSession } from "../../auth/hooks/useSession.ts";
import { yourPositionPanel } from "../own/yourPositionPanel.ts";
import type { LeaderboardPlayer } from "./useLeaderboard.ts";

export function useYourPosition(own: LeaderboardPlayer | null) {
  const { kind } = useSession().session;
  return yourPositionPanel(own, kind === "player" || kind === "named");
}
