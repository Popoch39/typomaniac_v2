import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/apiClient.ts";

/** The signed-in Player's own Standing. Keyed by Player, so one signing in after another never sees the other's. */
export const standingQueryOptions = (playerId: string) =>
  queryOptions({
    queryKey: ["standing", playerId],
    queryFn: async () => {
      const { data, error } = await apiClient.api.me.standing.get();
      if (error) throw error;
      return data;
    },
  });
