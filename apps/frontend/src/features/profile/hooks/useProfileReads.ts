import { useQuery } from "@tanstack/react-query";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import {
  loadingOnly,
  type ReadyData,
  readGate,
  readStage,
  retryFailed,
} from "../../../shared/api/readStage.ts";
import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import { ornamentQueryOptions } from "../../ornament/api/ornamentQueryOptions.ts";
import { progressQueryOptions } from "../../progress/api/progressQueryOptions.ts";
import { publicPlayerQueryOptions } from "../../player/api/publicPlayerQueryOptions.ts";
import { useProgressFilterStore } from "../../progress/store/useProgressFilterStore.ts";
import { useStanding } from "../../ranked/hooks/useStanding.ts";

export type ProfileProgress = NonNullable<
  ReadyData<ReturnType<typeof useProfileReads>>["progress"]
>;

/**
 * The reads the Profile lays out, sent together so that the page is drawn once they are all back, and
 * tried again together. Waits without reading while `player` is null, the session not being known yet.
 * The Ornament, the Progress and the public Player, whose Peak Tier the Progress shows, are only read
 * with a Nickname: the Ornament's route requires one and the other two find the Player by it. The
 * Ornament's failure is the picker's to say. Another period or kind of Duels keeps the Progress already
 * read until its own is back.
 */
export function useProfileReads(player: SignedInPlayer | null) {
  const { standing, read, failure } = useStanding(player);
  const filter = useProgressFilterStore((s) => s.filter);
  const nickname = player?.nickname ?? null;
  const ornament = useQuery(ornamentQueryOptions(nickname === null ? null : (player?.id ?? null)));
  const progress = useQuery(progressQueryOptions(nickname, filter));
  const publicPlayer = useQuery(publicPlayerQueryOptions(nickname));
  const nicknameReads = nickname === null ? [] : [progress, publicPlayer];
  const error = progress.error ?? publicPlayer.error;

  return readGate(
    readStage(nickname === null ? [read] : [read, loadingOnly(ornament), ...nicknameReads]),
    player === null || standing === null
      ? undefined
      : {
          player,
          standing,
          // Null for a Player without a Nickname, whose Progress is not read.
          progress:
            progress.data === undefined || publicPlayer.data === undefined
              ? null
              : { ...progress.data, peakTier: publicPlayer.data.peakTier },
          isProgressUpdating: progress.isPlaceholderData,
        },
    failure ?? (error === null ? null : describeApiError(error)),
    () => retryFailed(nickname === null ? [read] : [read, ornament, ...nicknameReads]),
  );
}
