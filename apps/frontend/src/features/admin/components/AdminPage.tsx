import { Page } from "../../../shared/components/Page.tsx";
import { PageHeader } from "../../../shared/components/PageHeader.tsx";
import { useSelectedReviewId } from "../hooks/useSelectedReviewId.ts";
import { ReviewDetail } from "./ReviewDetail.tsx";
import { ReviewQueue } from "./ReviewQueue.tsx";

export function AdminPage() {
  const reviewId = useSelectedReviewId();

  return (
    <Page>
      <PageHeader title="Admin" />
      <ReviewQueue />
      {reviewId !== undefined && <ReviewDetail key={reviewId} reviewId={reviewId} />}
    </Page>
  );
}
