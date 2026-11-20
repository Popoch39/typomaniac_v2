import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/apiClient.ts";

/** The open Reviews, highest Suspicion first, as the server orders them. */
export const openReviewsQueryOptions = () =>
  queryOptions({
    queryKey: ["admin", "reviews"],
    queryFn: async () => {
      const { data, error } = await apiClient.api.admin.reviews.get();
      if (error) throw error;
      return data;
    },
  });
