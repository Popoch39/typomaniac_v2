import { formatInstant } from "../review/formatInstant.ts";
import type { ReviewEnding } from "../review/reviewEnding.ts";
import { settledLine } from "../review/settledLine.ts";

export function useSettledReview({
  decision,
  settledAt,
}: {
  decision: ReviewEnding;
  settledAt: number;
}) {
  return { line: settledLine(decision), settledAt: formatInstant(settledAt) };
}
