import { useSettledReview } from "../hooks/useSettledReview.ts";
import type { ReviewEnding } from "../review/reviewEnding.ts";

interface SettledReviewProps {
  decision: ReviewEnding;
  settledAt: number;
}

/** How a settled Review ended and when: nothing is left to decide. */
export function SettledReview({ decision, settledAt }: SettledReviewProps) {
  const { line, settledAt: settledOn } = useSettledReview({ decision, settledAt });

  return (
    <section aria-label="Settlement" className="flex flex-col gap-3 pb-2">
      <h3 className="m-0 type-eyebrow text-ink-subtle">Settlement</h3>
      <p className="m-0">{line}</p>
      <p className="m-0 text-ink-muted">{settledOn}</p>
    </section>
  );
}
