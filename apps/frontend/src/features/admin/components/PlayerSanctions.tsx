import type { Review } from "../hooks/useReview.ts";
import { usePlayerSanctions } from "../hooks/usePlayerSanctions.ts";
import { PlayerSanctionRow } from "./PlayerSanctionRow.tsx";

interface PlayerSanctionsProps {
  review: Review;
}

/** Every Sanction of the reviewed Player, each revocable after an appeal until it is revoked. */
export function PlayerSanctions({ review }: PlayerSanctionsProps) {
  const { sanctions, isPending, revoke, failure } = usePlayerSanctions(review);

  return (
    <section aria-label="Sanctions" className="flex flex-col gap-2">
      <h3 className="m-0 type-eyebrow text-ink-subtle">Sanctions</h3>
      {sanctions.length === 0 ? (
        <p className="m-0 text-ink-muted">No Sanction.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {sanctions.map((sanction) => (
            <PlayerSanctionRow
              key={sanction.id}
              sanction={sanction}
              disabled={isPending}
              onRevoke={() => revoke(sanction.id)}
            />
          ))}
        </ul>
      )}
      <p role="alert" className="m-0 min-h-lh text-danger">
        {failure}
      </p>
    </section>
  );
}
