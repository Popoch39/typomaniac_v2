import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/apiClient.ts";
import { friendsQueryKey } from "./friendsQueryOptions.ts";

/** The Players whose Nickname starts with `term`, each with its relation; nothing is read while null. */
export const friendSearchQueryOptions = (term: string | null) =>
  queryOptions({
    queryKey: [...friendsQueryKey, "search", term],
    queryFn: async () => {
      if (term === null) return [];
      const { data, error } = await apiClient.api.friends.search.get({
        query: { nickname: term },
      });
      if (error) throw error;
      return data.players;
    },
    enabled: term !== null,
    // The results of the previous term stay up while the next ones are read, rather than emptying.
    placeholderData: keepPreviousData,
  });
