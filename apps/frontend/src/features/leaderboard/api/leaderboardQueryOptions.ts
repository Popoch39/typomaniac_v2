import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/apiClient.ts";

/** The top of the Leaderboard and, for a signed-in ranked Player, their own place in it. */
export const leaderboardQueryOptions = () =>
  queryOptions({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data, error } = await apiClient.api.leaderboard.get();
      if (error) throw error;
      return data;
    },
  });
