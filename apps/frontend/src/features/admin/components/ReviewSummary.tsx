import type { Review } from "../hooks/useReview.ts";
import { useReviewSummary } from "../hooks/useReviewSummary.ts";

interface ReviewSummaryProps {
  review: Review;
}

export function ReviewSummary({ review }: ReviewSummaryProps) {
  const { name, banned, reason, openedAt, suspicion, standing } = useReviewSummary(review);

  return (
    <dl className="m-0 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2">
      <dt className="text-ink-subtle">Player</dt>
      <dd className="m-0 font-bold">
        {name}
        {banned && <span className="ml-2 text-danger">Banned</span>}
      </dd>
      <dt className="text-ink-subtle">Opened for</dt>
      <dd className="m-0">
        {reason}, {openedAt}
      </dd>
      <dt className="text-ink-subtle">Suspicion</dt>
      <dd className="m-0 type-mono-sm">{suspicion}</dd>
      <dt className="text-ink-subtle">Standing</dt>
      <dd className="m-0">{standing}</dd>
    </dl>
  );
}
