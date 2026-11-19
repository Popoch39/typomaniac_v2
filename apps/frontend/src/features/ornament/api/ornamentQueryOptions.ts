import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/apiClient.ts";

/** The signed-in Player's Ornament choice and Peak Tier. Keyed by Player, so one signing in after another never sees the other's. */
export const ornamentQueryOptions = (playerId: string) =>
  queryOptions({
    queryKey: ["ornament", playerId],
    queryFn: async () => {
      const { data, error } = await apiClient.api.me.ornament.get();
      if (error) throw error;
      return data;
    },
  });
