import type { Review } from "../hooks/useReview.ts";
import { useReviewRecords } from "../hooks/useReviewRecords.ts";
import { ReviewRecordList } from "./ReviewRecordList.tsx";

interface ReviewRecordsProps {
  review: Review;
}

export function ReviewRecords({ review }: ReviewRecordsProps) {
  const { violations } = useReviewRecords(review);

  return <ReviewRecordList title="Violations" empty="No Violation." records={violations} />;
}
