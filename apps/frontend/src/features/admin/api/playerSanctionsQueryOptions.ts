import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/apiClient.ts";

/** Every Sanction of a Player, revoked ones included, newest first. */
export const playerSanctionsQueryOptions = (playerId: string) =>
  queryOptions({
    queryKey: ["admin", "players", playerId, "sanctions"],
    queryFn: async () => {
      const { data, error } = await apiClient.api.admin.players({ id: playerId }).sanctions.get();
      if (error) throw error;
      return data;
    },
  });
