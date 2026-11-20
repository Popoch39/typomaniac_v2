import { queryOptions, skipToken } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/apiClient.ts";

/**
 * The signed-in Player's Ornament choice and Peak Tier. Keyed by Player, so one signing in after another
 * never sees the other's. Not read without a Player.
 */
export const ornamentQueryOptions = (playerId: string | null) =>
  queryOptions({
    queryKey: ["ornament", playerId],
    queryFn:
      playerId === null
        ? skipToken
        : async () => {
            const { data, error } = await apiClient.api.me.ornament.get();
            if (error) throw error;
            return data;
          },
  });
