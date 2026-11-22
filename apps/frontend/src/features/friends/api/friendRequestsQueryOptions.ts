import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/apiClient.ts";
import { friendsQueryKey } from "./friendsQueryOptions.ts";

/** The signed-in Player's received and sent Friend requests, newest first. */
export const friendRequestsQueryOptions = () =>
  queryOptions({
    queryKey: [...friendsQueryKey, "requests"],
    queryFn: async () => {
      const { data, error } = await apiClient.api.friends.requests.get();
      if (error) throw error;
      return data;
    },
  });
