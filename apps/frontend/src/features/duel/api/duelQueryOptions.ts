import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/apiClient.ts";

/** A Duel as anyone may read it: who sits in it. */
export const duelQueryOptions = (duelId: string) =>
  queryOptions({
    queryKey: ["duel", duelId],
    queryFn: async () => {
      const { data, error } = await apiClient.api.duels({ id: duelId }).get();
      if (error) throw error;
      return data;
    },
  });
