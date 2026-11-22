import { queryOptions, skipToken } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/apiClient.ts";
import { friendsQueryKey } from "./friendsQueryOptions.ts";

/**
 * The signed-in Player's relation to each Player named, for the Add Friend keys of a page; not read
 * while null. Under the Friend reads' key, so that a Friend request sent or accepted reads it again.
 */
export const relationsQueryOptions = (nicknames: readonly string[] | null) =>
  queryOptions({
    // Lowered as the server matches them, so that two spellings of one page share their read.
    queryKey: [
      ...friendsQueryKey,
      "relations",
      nicknames?.map((nickname) => nickname.toLowerCase()) ?? null,
    ],
    queryFn:
      nicknames === null
        ? skipToken
        : async () => {
            const { data, error } = await apiClient.api.friends.relations.get({
              query: { nicknames: [...nicknames] },
            });
            if (error) throw error;
            return data.players;
          },
  });
