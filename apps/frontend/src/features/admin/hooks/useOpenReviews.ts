import { useQuery } from "@tanstack/react-query";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import { readStage } from "../../../shared/api/readStage.ts";
import { openReviewsQueryOptions } from "../api/openReviewsQueryOptions.ts";
import { ADMINISTRATION_WORDING } from "../review/administrationWording.ts";

export type OpenReview = NonNullable<ReturnType<typeof useOpenReviews>["reviews"]>[number];

export function useOpenReviews() {
  const read = useQuery(openReviewsQueryOptions());
  const { data, error } = read;
  return {
    reviews: data ?? null,
    stage: readStage([read]),
    failure: error === null ? null : describeApiError(error, ADMINISTRATION_WORDING),
    retry: () => void read.refetch(),
  };
}
