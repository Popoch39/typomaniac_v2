import { CircleAlert, LoaderCircle } from "lucide-react";
import { Panel } from "../../../shared/components/Panel.tsx";
import { StatusMessage } from "../../../shared/components/StatusMessage.tsx";
import { useOpenReviews } from "../hooks/useOpenReviews.ts";
import { ReviewQueueRow } from "./ReviewQueueRow.tsx";

export function ReviewQueue() {
  const { reviews, isPending, failure } = useOpenReviews();

  return (
    <Panel title="Open Reviews" flat>
      {isPending && (
        <StatusMessage role="status" icon={LoaderCircle} message="Reading the Reviews…" />
      )}
      {failure !== null && <StatusMessage role="alert" icon={CircleAlert} message={failure} />}
      {reviews?.length === 0 && <p className="m-0 text-ink-muted">No Review is open.</p>}
      {reviews !== null && reviews.length > 0 && (
        <ol className="m-0 flex list-none flex-col gap-2 p-0">
          {reviews.map((review) => (
            <ReviewQueueRow key={review.id} review={review} />
          ))}
        </ol>
      )}
    </Panel>
  );
}
