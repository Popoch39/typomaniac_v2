import { formatInstant } from "../review/formatInstant.ts";
import type { Review } from "./useReview.ts";

const VIOLATION_KINDS = {
  multipleCharacters: "Several characters in one insert",
  noKeyPress: "An insert without a KeyPress",
} as const;

/** The Violations of a Review, each on one line. */
export function useReviewRecords({ violations }: Review) {
  return {
    violations: violations.map(({ duelId, round, kind, committedAt }) => ({
      key: `${duelId}-${round}-${committedAt}`,
      line: `${VIOLATION_KINDS[kind]}, Round ${round}, ${formatInstant(committedAt)}`,
    })),
  };
}
