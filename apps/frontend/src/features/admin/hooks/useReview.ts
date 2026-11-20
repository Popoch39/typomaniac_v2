import { useQuery } from "@tanstack/react-query";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import { reviewQueryOptions } from "../api/reviewQueryOptions.ts";
import { ADMINISTRATION_WORDING } from "../review/administrationWording.ts";

export type Review = NonNullable<ReturnType<typeof useReview>["review"]>;

export type ReviewedDuel = Review["duels"][number];

export type ReviewedGame = ReviewedDuel["games"][number];

export function useReview(reviewId: string) {
  const { data, isPending, error } = useQuery(reviewQueryOptions(reviewId));
  return {
    review: data ?? null,
    isPending,
    failure: error === null ? null : describeApiError(error, ADMINISTRATION_WORDING),
  };
}
