import { useQuery } from "@tanstack/react-query";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import { readStage, retryFailed } from "../../../shared/api/readStage.ts";
import { progressQueryOptions } from "../api/progressQueryOptions.ts";
import { publicPlayerQueryOptions } from "../api/publicPlayerQueryOptions.ts";
import { useProgressFilterStore } from "../store/useProgressFilterStore.ts";

export type PublicPlayer = NonNullable<ReturnType<typeof usePlayerPageReads>["player"]>;

export type Progress = NonNullable<ReturnType<typeof usePlayerPageReads>["progress"]>;

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
  return {
    player: player.data ?? null,
    progress: progress.data ?? null,
    isProgressUpdating: progress.isPlaceholderData,
    stage: readStage([player, progress]),
    failure: error === null ? null : describeApiError(error),
    retry: () => retryFailed([player, progress]),
  };
}
