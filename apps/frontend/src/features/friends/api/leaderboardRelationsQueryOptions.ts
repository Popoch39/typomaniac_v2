import { queryOptions, skipToken } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/apiClient.ts";
import { friendsQueryKey } from "./friendsQueryOptions.ts";

/**
 * The signed-in Player's relation to each Player of a Leaderboard page, which the server finds from
 * the page number alone, so that it is read beside the page rather than once its rows are known; not
 * read while null. Under the Friend reads' key, so that a Friend request sent or accepted reads it again.
 */
export const leaderboardRelationsQueryOptions = (page: number | null) =>
  queryOptions({
    queryKey: [...friendsQueryKey, "relations", "leaderboard", page],
    queryFn:
      page === null
        ? skipToken
        : async () => {
            const { data, error } = await apiClient.api.friends.relations.leaderboard.get({
              query: { page },
            });
            if (error) throw error;
            return data.players;
          },
  });
