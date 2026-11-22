import { useQuery } from "@tanstack/react-query";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import { loadingOnly, readStage, retryFailed } from "../../../shared/api/readStage.ts";
import { useAddFriendTargets } from "../../friends/hooks/useAddFriendTargets.ts";
import { progressQueryOptions } from "../../progress/api/progressQueryOptions.ts";
import { useProgressFilterStore } from "../../progress/store/useProgressFilterStore.ts";
import { publicPlayerQueryOptions } from "../api/publicPlayerQueryOptions.ts";

export type PublicPlayer = NonNullable<ReturnType<typeof usePlayerPageReads>["player"]>;

export type Progress = NonNullable<ReturnType<typeof usePlayerPageReads>["progress"]>;

/**
 * The reads a Player's public page lays out, sent together so that the page is drawn once they are all
 * back, and tried again together. Another period or kind of Duels keeps the Progress already read
 * until its own is back. The signed-in Player's relation to this one is looked up by the Nickname of
 * the URL beside them, so that the Add Friend key is drawn with the page rather than after it.
 */
export function usePlayerPageReads(nickname: string) {
  const filter = useProgressFilterStore((s) => s.filter);
  const player = useQuery(publicPlayerQueryOptions(nickname));
  const progress = useQuery(progressQueryOptions(nickname, filter));
  const { targetOf, me, relations } = useAddFriendTargets([nickname]);
  const reads = relations === null ? [player, progress] : [player, progress, relations];
  const error = reads.find((read) => read.error !== null)?.error ?? null;
  return {
    player: player.data ?? null,
    // With the Peak Tier of all time, which the Progress shows beside its own period.
    progress:
      player.data === undefined || progress.data === undefined
        ? null
        : { ...progress.data, peakTier: player.data.peakTier },
    isProgressUpdating: progress.isPlaceholderData,
    addFriend: targetOf(nickname),
    // Whether the reader is a Guest decides whether there is a relation to read: the page waits on it,
    // but a failure to read the session only leaves the key out.
    stage: readStage([...reads, loadingOnly(me)]),
    failure: error === null ? null : describeApiError(error),
    retry: () => retryFailed(reads),
  };
}
