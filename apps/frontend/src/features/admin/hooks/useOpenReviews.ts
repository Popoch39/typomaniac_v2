import { useQuery } from "@tanstack/react-query";
import { describeApiError } from "../../../shared/api/describeApiError.ts";
import { type ReadyData, readGate, readStage } from "../../../shared/api/readStage.ts";
import { openReviewsQueryOptions } from "../api/openReviewsQueryOptions.ts";
import { ADMINISTRATION_WORDING } from "../review/administrationWording.ts";

export type OpenReview = ReadyData<ReturnType<typeof useOpenReviews>>[number];

export function useOpenReviews() {
  const read = useQuery(openReviewsQueryOptions());
  const { data, error } = read;
  return readGate(
    readStage([read]),
    data,
    error === null ? null : describeApiError(error, ADMINISTRATION_WORDING),
    () => void read.refetch(),
  );
}
