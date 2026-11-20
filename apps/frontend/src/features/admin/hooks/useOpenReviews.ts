import { useQuery } from "@tanstack/react-query";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import { openReviewsQueryOptions } from "../api/openReviewsQueryOptions.ts";
import { ADMINISTRATION_WORDING } from "../review/administrationWording.ts";

export type OpenReview = NonNullable<ReturnType<typeof useOpenReviews>["reviews"]>[number];

export function useOpenReviews() {
  const { data, isPending, error } = useQuery(openReviewsQueryOptions());
  return {
    reviews: data ?? null,
    isPending,
    failure: error === null ? null : describeApiError(error, ADMINISTRATION_WORDING),
  };
}
