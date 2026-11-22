import { readGate, readStage, retryFailed } from "../../../shared/api/readStage.ts";
import type { ChainedSession } from "../../auth/session/sessionOf.ts";
import { useVoidedDuels } from "../../fair-play/hooks/useVoidedDuels.ts";
import { useStanding } from "./useStanding.ts";

/**
 * The reads the Ranked page lays out, the Standing and the Player's fair-play state, sent together so
 * that the notice of a Suspension or a Voided Duel never pushes in above a page already drawn, and
 * tried again together. Waits without reading while the session is checked.
 */
export function useRankedReads(session: ChainedSession) {
  const player = session.kind === "checking" ? null : session.player;
  const standing = useStanding(player);
  const fairPlay = useVoidedDuels(player);
  return readGate(
    readStage([standing.read, fairPlay.read]),
    session.kind === "checking" || standing.standing === null || fairPlay.voidedDuels === null
      ? undefined
      : {
          session,
          standing: standing.standing,
          voidedDuels: fairPlay.voidedDuels,
          suspension: fairPlay.suspension,
        },
    standing.failure ?? fairPlay.failure,
    () => retryFailed([standing.read, fairPlay.read]),
  );
}
