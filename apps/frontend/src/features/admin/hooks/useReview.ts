import { useQuery } from "@tanstack/react-query";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import { readStage } from "../../../shared/api/readStage.ts";
import { reviewQueryOptions } from "../api/reviewQueryOptions.ts";
import { ADMINISTRATION_WORDING } from "../review/administrationWording.ts";

export type Review = NonNullable<ReturnType<typeof useReview>["review"]>;

export type ReviewedDuel = Review["duels"][number];

export type ReviewedGame = ReviewedDuel["games"][number];

export function useReview(reviewId: string) {
  const read = useQuery(reviewQueryOptions(reviewId));
  const { data, error } = read;
  return {
    review: data ?? null,
    stage: readStage([read]),
    failure: error === null ? null : describeApiError(error, ADMINISTRATION_WORDING),
    retry: () => void read.refetch(),
  };
}
