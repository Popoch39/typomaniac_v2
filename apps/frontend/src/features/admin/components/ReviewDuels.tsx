import type { ReviewedDuel } from "../hooks/useReview.ts";
import { ReviewDuel } from "./ReviewDuel.tsx";

interface ReviewDuelsProps {
  duels: ReviewedDuel[];
}

export function ReviewDuels({ duels }: ReviewDuelsProps) {
  return (
    <section aria-label="Recent ranked Duels" className="flex flex-col gap-3">
      <h3 className="m-0 type-eyebrow text-ink-subtle">Recent ranked Duels</h3>
      {duels.length === 0 ? (
        <p className="m-0 text-ink-muted">No ranked Duel yet.</p>
      ) : (
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {duels.map((duel) => (
            <ReviewDuel key={duel.duelId} duel={duel} />
          ))}
        </ol>
      )}
    </section>
  );
}
