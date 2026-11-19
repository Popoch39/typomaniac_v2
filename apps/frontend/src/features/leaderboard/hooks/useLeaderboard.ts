import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import { leaderboardQueryOptions } from "../api/leaderboardQueryOptions.ts";
import { pageToReplace } from "../page/pageToReplace.ts";

export type Leaderboard = NonNullable<ReturnType<typeof useLeaderboard>["leaderboard"]>;

export type LeaderboardPlayer = Leaderboard["podium"][number];

/**
 * The page of the Leaderboard the URL asks for, and the page the URL must be replaced by when the
 * server served another one. The page shown stays until the next one is read, so that turning a page
 * never blanks the Leaderboard.
 */
export function useLeaderboard() {
  const { page } = useSearch({ from: "/_shell/leaderboard" });
  const { data, isPending, error } = useQuery({
    ...leaderboardQueryOptions(page),
    placeholderData: keepPreviousData,
  });
  return {
    leaderboard: data ?? null,
    isPending,
    failure: error === null ? null : describeApiError(error),
    replacingPage: data === undefined ? null : pageToReplace(page, data.page),
  };
}
