import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import { readStage } from "../../../shared/api/readStage.ts";
import { meQueryOptions } from "../../auth/api/meQueryOptions.ts";
import { leaderboardQueryOptions } from "../api/leaderboardQueryOptions.ts";
import { pageToReplace } from "../page/pageToReplace.ts";

export type Leaderboard = NonNullable<ReturnType<typeof useLeaderboard>["leaderboard"]>;

export type LeaderboardPlayer = Leaderboard["podium"][number];

/**
 * The page of the Leaderboard the URL asks for, and the page the URL must be replaced by when the
 * server served another one. The page shown stays until the next one is read, so that turning a page
 * never blanks the Leaderboard. The session is waited on too: it decides whether "Your position" is
 * laid out.
 */
export function useLeaderboard() {
  const { page } = useSearch({ from: "/_shell/leaderboard" });
  const me = useQuery(meQueryOptions());
  const read = useQuery({ ...leaderboardQueryOptions(page), placeholderData: keepPreviousData });
  const { data, isPlaceholderData } = read;
  const error = me.error ?? read.error;
  return {
    leaderboard: data ?? null,
    stage: readStage([me, read]),
    isSessionKnown: !me.isPending,
    isSignedIn: me.data != null,
    failure: error === null ? null : describeApiError(error),
    retry: () => {
      if (me.isError) void me.refetch();
      if (read.isError) void read.refetch();
    },
    replacingPage:
      data === undefined
        ? null
        : pageToReplace(page, { page: data.page, isPlaceholder: isPlaceholderData }),
  };
}
