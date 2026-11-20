import { useQuery } from "@tanstack/react-query";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import { progressQueryOptions } from "../api/progressQueryOptions.ts";
import { publicPlayerQueryOptions } from "../api/publicPlayerQueryOptions.ts";

export type PublicPlayer = NonNullable<ReturnType<typeof usePlayerPageReads>["player"]>;

/** The reads a Player's public page lays out, sent together so that the page is drawn once they are all back. */
export function usePlayerPageReads(nickname: string) {
  const player = useQuery(publicPlayerQueryOptions(nickname));
  const progress = useQuery(progressQueryOptions(nickname));
  const error = player.error ?? progress.error;
  return {
    player: player.data ?? null,
    progress: progress.data ?? null,
    isPending: player.isPending || progress.isPending,
    failure: error === null ? null : describeApiError(error),
  };
}
