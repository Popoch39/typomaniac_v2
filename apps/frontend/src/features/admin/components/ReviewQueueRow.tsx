import { Link } from "@tanstack/react-router";
import type { OpenReview } from "../hooks/useOpenReviews.ts";
import { useReviewQueueRow } from "../hooks/useReviewQueueRow.ts";

interface ReviewQueueRowProps {
  review: OpenReview;
}

export function ReviewQueueRow({ review }: ReviewQueueRowProps) {
  const { name, reason, openedAt, suspicion } = useReviewQueueRow(review);

  return (
    <li>
      <Link
        to="/admin"
        search={{ review: review.id }}
        className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 rounded-md border-2 border-key-outline bg-key-face px-4 py-3 text-ink hover:bg-surface-raised data-[status=active]:bg-surface-raised"
      >
        <span className="font-bold">{name}</span>
        <span className="type-mono-sm text-ink">{suspicion}</span>
        <span className="text-ink-muted">{reason}</span>
        <span className="text-ink-subtle">Opened {openedAt}</span>
      </Link>
    </li>
  );
}
