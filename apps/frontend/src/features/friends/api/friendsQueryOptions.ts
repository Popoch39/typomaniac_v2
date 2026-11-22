import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/apiClient.ts";
import { queryClient } from "../../../shared/api/queryClient.ts";

/** The key every Friend read is cached under, to read them all again after a change. */
export const friendsQueryKey = ["friends"] as const;

/** The signed-in Player's Friends, by Nickname. */
export const friendsQueryOptions = () =>
  queryOptions({
    queryKey: [...friendsQueryKey, "list"],
    queryFn: async () => {
      const { data, error } = await apiClient.api.friends.get();
      if (error) throw error;
      return data.friends;
    },
  });

/** Another Player as a Friend, a Friend request or a search result shows them. */
export type ListedPlayer = Awaited<
  ReturnType<NonNullable<ReturnType<typeof friendsQueryOptions>["queryFn"]>>
>[number];

/**
 * Reads every Friend read again after a change, resolving once they are back, so that an action's
 * pending label holds until the page shows its outcome.
 */
export const refreshFriendReads = () =>
  queryClient.invalidateQueries({ queryKey: friendsQueryKey });
