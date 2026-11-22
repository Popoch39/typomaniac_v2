import { useQuery } from "@tanstack/react-query";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import {
  loadingOnly,
  type ReadyData,
  readGate,
  readStage,
  retryFailed,
} from "../../../shared/api/readStage.ts";
import type { ChainedSession } from "../../auth/session/sessionOf.ts";
import { ornamentQueryOptions } from "../../ornament/api/ornamentQueryOptions.ts";
import { progressQueryOptions } from "../../progress/api/progressQueryOptions.ts";
import { publicPlayerQueryOptions } from "../../player/api/publicPlayerQueryOptions.ts";
import { useProgressFilterStore } from "../../progress/store/useProgressFilterStore.ts";
import { useStanding } from "../../ranked/hooks/useStanding.ts";

/** The Profile as drawn: a named Player's also holds their Progress. */
export type Profile = ReadyData<ReturnType<typeof useProfileReads>>;

/**
 * The reads the Profile lays out, sent together so that the page is drawn once they are all back, and
 * tried again together. Waits without reading while the session is checked. The Ornament, the
 * Progress and the public Player, whose Peak Tier the Progress shows, are only read for a named
 * Player: the Ornament's route requires a Nickname and the other two find the Player by it. The
 * Ornament's failure is the picker's to say. Another period or kind of Duels keeps the Progress already
 * read until its own is back.
 */
export function useProfileReads(session: ChainedSession) {
  const { standing, read, failure } = useStanding(
    session.kind === "checking" ? null : session.player,
  );
  const filter = useProgressFilterStore((s) => s.filter);
  const named = session.kind === "named" ? session.player : null;
  const ornament = useQuery(ornamentQueryOptions(named?.id ?? null));
  const progress = useQuery(progressQueryOptions(named?.nickname ?? null, filter));
  const publicPlayer = useQuery(publicPlayerQueryOptions(named?.nickname ?? null));
  const namedReads = named === null ? [] : [progress, publicPlayer];
  const error = progress.error ?? publicPlayer.error;

  return readGate(
    readStage(named === null ? [read] : [read, loadingOnly(ornament), ...namedReads]),
    profileOf(),
    failure ?? (error === null ? null : describeApiError(error)),
    () => retryFailed(named === null ? [read] : [read, ornament, ...namedReads]),
  );

  function profileOf() {
    if (session.kind === "checking" || standing === null) return undefined;
    if (session.kind === "player") return { ...session, standing };
    if (progress.data === undefined || publicPlayer.data === undefined) return undefined;
    return {
      ...session,
      standing,
      progress: { ...progress.data, peakTier: publicPlayer.data.peakTier },
      isProgressUpdating: progress.isPlaceholderData,
    };
  }
}
