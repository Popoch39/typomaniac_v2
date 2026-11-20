import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/apiClient.ts";

/** One Review with everything the administrator decides on. */
export const reviewQueryOptions = (reviewId: string) =>
  queryOptions({
    queryKey: ["admin", "reviews", reviewId],
    queryFn: async () => {
      const { data, error } = await apiClient.api.admin.reviews({ id: reviewId }).get();
      if (error) throw error;
      return data;
    },
  });
