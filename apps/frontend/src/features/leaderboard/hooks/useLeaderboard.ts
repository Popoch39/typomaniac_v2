import { useQuery } from "@tanstack/react-query";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import { leaderboardQueryOptions } from "../api/leaderboardQueryOptions.ts";

export type LeaderboardPlayer = NonNullable<
  NonNullable<ReturnType<typeof useLeaderboard>["leaderboard"]>["own"]
>;

export function useLeaderboard() {
  const { data, isPending, error } = useQuery(leaderboardQueryOptions());
  return {
    leaderboard: data ?? null,
    isPending,
    failure: error === null ? null : describeApiError(error),
  };
}
