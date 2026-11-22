import { LoadingState } from "../../../shared/components/LoadingState.tsx";
import { Panel } from "../../../shared/components/Panel.tsx";
import { ReadGate } from "../../../shared/components/ReadGate.tsx";
import { useOpenReviews } from "../hooks/useOpenReviews.ts";
import { ReviewQueueRow } from "./ReviewQueueRow.tsx";

export function ReviewQueue() {
  const gate = useOpenReviews();

  return (
    <ReadGate
      state={gate}
      pending={
        <Panel title="Open Reviews" flat>
          <LoadingState message="Reading the Reviews…" />
        </Panel>
      }
      title="Open Reviews"
    >
      {(reviews) => (
        <Panel title="Open Reviews" flat>
          {reviews.length === 0 ? (
            <p className="m-0 text-ink-muted">No Review is open.</p>
          ) : (
            <ol className="m-0 flex list-none flex-col gap-2 p-0">
              {reviews.map((review) => (
                <ReviewQueueRow key={review.id} review={review} />
              ))}
            </ol>
          )}
        </Panel>
      )}
    </ReadGate>
  );
}
