import { useQuery } from "@tanstack/react-query";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import { type ReadyData, readGate, readStage } from "../../../shared/api/readStage.ts";
import { reviewQueryOptions } from "../api/reviewQueryOptions.ts";
import { ADMINISTRATION_WORDING } from "../review/administrationWording.ts";

export type Review = ReadyData<ReturnType<typeof useReview>>;

export type ReviewedDuel = Review["duels"][number];

export type ReviewedGame = ReviewedDuel["games"][number];

export function useReview(reviewId: string) {
  const read = useQuery(reviewQueryOptions(reviewId));
  const { data, error } = read;
  return readGate(
    readStage([read]),
    data,
    error === null ? null : describeApiError(error, ADMINISTRATION_WORDING),
    () => void read.refetch(),
  );
}
