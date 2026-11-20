import { useQuery } from "@tanstack/react-query";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import { openReviewsQueryOptions } from "../api/openReviewsQueryOptions.ts";

export type OpenReview = NonNullable<ReturnType<typeof useOpenReviews>["reviews"]>[number];

export function useOpenReviews() {
  const { data, isPending, error } = useQuery(openReviewsQueryOptions());
  return {
    reviews: data ?? null,
    isPending,
    failure: error === null ? null : describeApiError(error, ADMINISTRATION_WORDING),
  };
}

/** How the administration routes' own refusals read. */
export const ADMINISTRATION_WORDING = {
  FORBIDDEN: "Only the administrator can see this page.",
  REVIEW_NOT_FOUND: "This Review does not exist.",
};
