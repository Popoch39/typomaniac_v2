import { LoadingState } from "../../../shared/components/LoadingState.tsx";
import { Panel } from "../../../shared/components/Panel.tsx";
import { ReadGate } from "../../../shared/components/ReadGate.tsx";
import { useReview } from "../hooks/useReview.ts";
import { PlayerSanctions } from "./PlayerSanctions.tsx";
import { ReviewDuels } from "./ReviewDuels.tsx";
import { ReviewRecords } from "./ReviewRecords.tsx";
import { ReviewReports } from "./ReviewReports.tsx";
import { ReviewSettlement } from "./ReviewSettlement.tsx";
import { ReviewSummary } from "./ReviewSummary.tsx";

interface ReviewDetailProps {
  reviewId: string;
}

export function ReviewDetail({ reviewId }: ReviewDetailProps) {
  const gate = useReview(reviewId);

  return (
    <ReadGate
      state={gate}
      pending={
        <Panel title="Review" flat>
          <LoadingState message="Reading the Review…" />
        </Panel>
      }
      title="Review"
    >
      {(review) => (
        <Panel title="Review" flat>
          <ReviewSummary review={review} />
          <ReviewDuels duels={review.duels} />
          <ReviewRecords review={review} />
          <ReviewReports review={review} />
          <PlayerSanctions review={review} />
          <ReviewSettlement review={review} />
        </Panel>
      )}
    </ReadGate>
  );
}
