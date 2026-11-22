import { useQuery } from "@tanstack/react-query";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import { type ReadyData, readGate, readStage, retryFailed } from "../../../shared/api/readStage.ts";
import { progressQueryOptions } from "../../progress/api/progressQueryOptions.ts";
import { useProgressFilterStore } from "../../progress/store/useProgressFilterStore.ts";
import { publicPlayerQueryOptions } from "../api/publicPlayerQueryOptions.ts";

type PlayerPage = ReadyData<ReturnType<typeof usePlayerPageReads>>;

export type PublicPlayer = PlayerPage["player"];

export type Progress = PlayerPage["progress"];

/**
 * The reads a Player's public page lays out, sent together so that the page is drawn once they are all
 * back, and tried again together. Another period or kind of Duels keeps the Progress already read
 * until its own is back.
 */
export function usePlayerPageReads(nickname: string) {
  const filter = useProgressFilterStore((s) => s.filter);
  const player = useQuery(publicPlayerQueryOptions(nickname));
  const progress = useQuery(progressQueryOptions(nickname, filter));
  const error = player.error ?? progress.error;
  return readGate(
    readStage([player, progress]),
    player.data === undefined || progress.data === undefined
      ? undefined
      : {
          player: player.data,
          // With the Peak Tier of all time, which the Progress shows beside its own period.
          progress: { ...progress.data, peakTier: player.data.peakTier },
          isProgressUpdating: progress.isPlaceholderData,
        },
    error === null ? null : describeApiError(error),
    () => retryFailed([player, progress]),
  );
}
