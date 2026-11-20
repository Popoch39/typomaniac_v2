import type { Review } from "../hooks/useReview.ts";
import { useReviewReports } from "../hooks/useReviewReports.ts";
import { ReviewRecordList } from "./ReviewRecordList.tsx";

interface ReviewReportsProps {
  review: Review;
}

export function ReviewReports({ review }: ReviewReportsProps) {
  const reports = useReviewReports(review);

  return <ReviewRecordList title="Reports" empty="No Report." records={reports} />;
}
