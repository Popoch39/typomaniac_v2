import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import { type ReadyData, readGate, readStage } from "../../../shared/api/readStage.ts";
import { meQueryOptions } from "../../auth/api/meQueryOptions.ts";
import { leaderboardQueryOptions } from "../api/leaderboardQueryOptions.ts";
import { pageToReplace } from "../page/pageToReplace.ts";

export type Leaderboard = ReadyData<ReturnType<typeof useLeaderboard>["gate"]>;

export type LeaderboardPlayer = Leaderboard["podium"][number];

/**
 * The page of the Leaderboard the URL asks for, and the page the URL must be replaced by when the
 * server served another one. The page shown stays until the next one is read, so that turning a page
 * never blanks the Leaderboard. The session is not waited on: only "Your position" depends on it, and
 * the skeleton drops that Panel only once the reader is known to be a Guest.
 */
export function useLeaderboard() {
  const { page } = useSearch({ from: "/_shell/leaderboard" });
  const me = useQuery(meQueryOptions());
  const read = useQuery({ ...leaderboardQueryOptions(page), placeholderData: keepPreviousData });
  const { data, isPlaceholderData, error } = read;
  return {
    gate: readGate(
      readStage([read]),
      data,
      error === null ? null : describeApiError(error),
      () => void read.refetch(),
    ),
    isGuest: me.data === null,
    replacingPage:
      data === undefined
        ? null
        : pageToReplace(page, { page: data.page, isPlaceholder: isPlaceholderData }),
  };
}
