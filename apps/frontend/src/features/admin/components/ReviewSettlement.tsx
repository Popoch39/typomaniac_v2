import type { Review } from "../hooks/useReview.ts";
import { reviewLifecycleOf } from "../review/reviewLifecycle.ts";
import { ReviewEndings } from "./ReviewEndings.tsx";
import { SettledReview } from "./SettledReview.tsx";

interface ReviewSettlementProps {
  review: Review;
}

/** The endings of an open Review, or the decision of a settled one, read-only. */
export function ReviewSettlement({ review }: ReviewSettlementProps) {
  const lifecycle = reviewLifecycleOf(review.settlement);

  return lifecycle.kind === "open" ? (
    <ReviewEndings review={review} />
  ) : (
    <SettledReview decision={lifecycle.decision} settledAt={lifecycle.settledAt} />
  );
}
