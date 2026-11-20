import { formatInstant } from "../review/formatInstant.ts";
import { reviewReasonLabel } from "../review/reviewReasonLabel.ts";
import { reviewStandingLine } from "../review/reviewStandingLine.ts";
import type { Review } from "./useReview.ts";

export function useReviewSummary({ player, reason, openedAt, suspicion, standing }: Review) {
  return {
    name: player.nickname ?? "No Nickname",
    banned: player.banned,
    reason: reviewReasonLabel(reason),
    openedAt: formatInstant(openedAt),
    suspicion: suspicion === null ? "No Suspicion yet" : suspicion.toFixed(2),
    standing: reviewStandingLine(standing),
  };
}
