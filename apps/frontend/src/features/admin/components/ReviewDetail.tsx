import { CircleAlert, LoaderCircle } from "lucide-react";
import { Panel } from "../../../shared/components/Panel.tsx";
import { StatusMessage } from "../../../shared/components/StatusMessage.tsx";
import { useReview } from "../hooks/useReview.ts";
import { ReviewDuels } from "./ReviewDuels.tsx";
import { ReviewRecords } from "./ReviewRecords.tsx";
import { ReviewReports } from "./ReviewReports.tsx";
import { ReviewSummary } from "./ReviewSummary.tsx";

interface ReviewDetailProps {
  reviewId: string;
}

export function ReviewDetail({ reviewId }: ReviewDetailProps) {
  const { review, isPending, failure } = useReview(reviewId);

  if (isPending)
    return <StatusMessage role="status" icon={LoaderCircle} message="Reading the Review…" />;
  if (failure !== null) return <StatusMessage role="alert" icon={CircleAlert} message={failure} />;
  if (review === null) return null;
  return (
    <Panel title="Review" flat>
      <ReviewSummary review={review} />
      <ReviewDuels duels={review.duels} />
      <ReviewRecords review={review} />
      <ReviewReports review={review} />
    </Panel>
  );
}
