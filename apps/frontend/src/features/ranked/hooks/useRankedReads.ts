import { readStage, retryFailed } from "../../../shared/api/readStage.ts";
import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import { useVoidedDuels } from "../../fair-play/hooks/useVoidedDuels.ts";
import { useStanding } from "./useStanding.ts";

/**
 * The reads the Ranked page lays out, the Standing and the Player's fair-play state, sent together so
 * that the notice of a Suspension or a Voided Duel never pushes in above a page already drawn, and
 * tried again together. Waits without reading while `player` is null, the session not being known yet.
 */
export function useRankedReads(player: SignedInPlayer | null) {
  const standing = useStanding(player);
  const fairPlay = useVoidedDuels(player);
  return {
    standing: standing.standing,
    voidedDuels: fairPlay.voidedDuels,
    suspension: fairPlay.suspension,
    stage: readStage([standing.read, fairPlay.read]),
    failure: standing.failure ?? fairPlay.failure,
    retry: () => retryFailed([standing.read, fairPlay.read]),
  };
}
