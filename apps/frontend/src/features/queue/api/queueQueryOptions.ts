import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/apiClient.ts";

/** Whether the signed-in Player is queued; it fails with the reason when they may not enter the Queue. */
export const queueQueryOptions = () =>
  queryOptions({
    queryKey: ["queue"],
    queryFn: async () => {
      const { data, error } = await apiClient.api.queue.get();
      if (error) throw error;
      return data;
    },
  });
