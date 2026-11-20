import { queryOptions, skipToken } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/apiClient.ts";

/**
 * The signed-in Player's own fair-play state. Keyed by Player, so one signing in after another never
 * sees the other's. Not read without a Player, while the session is checked.
 */
export const fairPlayQueryOptions = (playerId: string | null) =>
  queryOptions({
    queryKey: ["fair-play", playerId],
    queryFn:
      playerId === null
        ? skipToken
        : async () => {
            const { data, error } = await apiClient.api.me["fair-play"].get();
            if (error) throw error;
            return data;
          },
  });
