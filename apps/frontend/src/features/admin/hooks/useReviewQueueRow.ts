import { formatInstant } from "../review/formatInstant.ts";
import { reviewReasonLabel } from "../review/reviewReasonLabel.ts";
import type { OpenReview } from "./useOpenReviews.ts";

export function useReviewQueueRow({ nickname, reason, openedAt, suspicion }: OpenReview) {
  return {
    name: nickname ?? "No Nickname",
    reason: reviewReasonLabel(reason),
    openedAt: formatInstant(openedAt),
    suspicion: suspicion === null ? "No Suspicion yet" : `Suspicion ${suspicion.toFixed(2)}`,
  };
}
