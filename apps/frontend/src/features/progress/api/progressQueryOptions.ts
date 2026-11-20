import { queryOptions, skipToken } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/apiClient.ts";
import type { ProgressFilter } from "../filter/progressFilter.ts";
import { retryUnlessNotFound } from "../../../shared/api/retryUnlessNotFound.ts";

/**
 * The Games of the Duels of a Player that the period and the kind select, oldest first. Not read
 * without a Nickname.
 */
export const progressQueryOptions = (nickname: string | null, { window, kind }: ProgressFilter) => {
  // Lowered as the server looks it up, so that two spellings of one Nickname share their read.
  const player = nickname?.toLowerCase() ?? null;
  return queryOptions({
    queryKey: ["progress", player, window, kind],
    queryFn:
      nickname === null
        ? skipToken
        : async () => {
            const { data, error } = await apiClient.api
              .players({ nickname })
              .progress.get({ query: { window, kind } });
            if (error) throw error;
            return data;
          },
    retry: retryUnlessNotFound,
    // The same Player's charts stay drawn while another period or kind is read, so that no Panel
    // empties or moves; another Player's never stand in for this one's.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === player ? previous : undefined,
  });
};
