import { useSignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import type { LeaderboardPlayer } from "./useLeaderboard.ts";

/**
 * What the page says of the reader's own place: their row when they are ranked, a word on Placement
 * when they are signed in but Unranked, nothing for a Guest.
 */
export function useOwnPlace(own: LeaderboardPlayer | null) {
  const { player } = useSignedInPlayer();
  if (own !== null) return { kind: "ranked", own } as const;
  if (player === null) return { kind: "guest" } as const;
  return { kind: "unranked" } as const;
}
