import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/apiClient.ts";

/** The signed-in Player, or null for a Guest. */
export const meQueryOptions = () =>
  queryOptions({
    queryKey: ["me"],
    queryFn: async () => {
      const { data, error } = await apiClient.api.me.get();
      // A Guest is answered 401: being signed out is not a failure.
      if (error?.status === 401) return null;
      if (error) throw error;
      return data;
    },
  });
