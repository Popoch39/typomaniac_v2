import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/apiClient.ts";
import { queryClient } from "../../../shared/api/queryClient.ts";

/** The key every page of the Leaderboard is cached under, to refresh them all at once. */
export const leaderboardQueryKey = ["leaderboard"] as const;

// A Duel moves Positions: past this, a page is read again rather than trusted.
const STALE_TIME_MS = 30_000;

/** The Podium, one page of the Leaderboard and, for a signed-in ranked Player, their own Position. */
export const leaderboardQueryOptions = (page: number) =>
  queryOptions({
    queryKey: [...leaderboardQueryKey, page],
    queryFn: async () => {
      const { data, error } = await apiClient.api.leaderboard.get({ query: { page } });
      if (error) throw error;
      // A page past the last one is served as the last page: caching it under that page too lets
      // the URL be corrected without reading it again.
      if (data.page !== page)
        queryClient.setQueryData(leaderboardQueryOptions(data.page).queryKey, data);
      return data;
    },
    staleTime: STALE_TIME_MS,
  });
