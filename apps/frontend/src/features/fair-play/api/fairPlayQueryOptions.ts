import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/apiClient.ts";

/** The signed-in Player's own fair-play state. Keyed by Player, so one signing in after another never sees the other's. */
export const fairPlayQueryOptions = (playerId: string) =>
  queryOptions({
    queryKey: ["fair-play", playerId],
    queryFn: async () => {
      const { data, error } = await apiClient.api.me["fair-play"].get();
      if (error) throw error;
      return data;
    },
  });
