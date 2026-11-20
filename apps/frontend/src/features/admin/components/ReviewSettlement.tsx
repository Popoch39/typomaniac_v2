import type { Review } from "../hooks/useReview.ts";
import { useSettleReview } from "../hooks/useSettleReview.ts";
import { Keycap } from "../../../shared/components/Keycap.tsx";
import { VoidableDuelChoice } from "./VoidableDuelChoice.tsx";

interface ReviewSettlementProps {
  review: Review;
}

/** The four endings of a Review, each one action. */
export function ReviewSettlement({ review }: ReviewSettlementProps) {
  const {
    voidable,
    chosenDuelIds,
    toggleDuel,
    isPending,
    isLocked,
    canVoid,
    endWith,
    settled,
    failure,
  } = useSettleReview(review);

  return (
    <section aria-label="Settle the Review" className="flex flex-col gap-3">
      <h3 className="m-0 type-eyebrow text-ink-subtle">Settle the Review</h3>
      {voidable.length === 0 ? (
        <p className="m-0 text-ink-muted">No won ranked Duel to void.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {voidable.map((duel) => (
            <VoidableDuelChoice
              key={duel.duelId}
              duel={duel}
              chosen={chosenDuelIds.includes(duel.duelId)}
              disabled={isLocked}
              onToggle={() => toggleDuel(duel.duelId)}
            />
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-3 pb-2">
        <Keycap size="sm" disabled={isLocked} onClick={() => endWith("cleared")}>
          Clear
        </Keycap>
        <Keycap size="sm" disabled={isLocked || !canVoid} onClick={() => endWith("voided_duels")}>
          Void chosen Duels
        </Keycap>
        <Keycap size="sm" disabled={isLocked} onClick={() => endWith("suspension")}>
          Suspend
        </Keycap>
        <Keycap size="sm" variant="danger" disabled={isLocked} onClick={() => endWith("ban")}>
          Ban
        </Keycap>
      </div>
      {failure === null ? (
        <p role="status" className="m-0 min-h-lh text-ink-muted">
          {isPending ? "Settling…" : settled}
        </p>
      ) : (
        <p role="alert" className="m-0 min-h-lh text-danger">
          {failure}
        </p>
      )}
    </section>
  );
}
