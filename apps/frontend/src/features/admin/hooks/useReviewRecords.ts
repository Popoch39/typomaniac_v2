import { formatInstant } from "../review/formatInstant.ts";
import type { Review } from "./useReview.ts";

const VIOLATION_KINDS = {
  multipleCharacters: "Several characters in one insert",
  noKeyPress: "An insert without a KeyPress",
} as const;

const SANCTION_KINDS = {
  voided_duel: "Voided Duel",
  suspension: "Suspension",
  ban: "Ban",
} as const;

const CAUSES = { violation: "a Violation", review: "a Review" } as const;

/** The Violations and Sanctions of a Review, each on one line. */
export function useReviewRecords({ violations, sanctions }: Review) {
  return {
    violations: violations.map(({ duelId, round, kind, committedAt }) => ({
      key: `${duelId}-${round}-${committedAt}`,
      line: `${VIOLATION_KINDS[kind]}, Round ${round}, ${formatInstant(committedAt)}`,
    })),
    sanctions: sanctions.map(({ id, kind, cause, startedAt, endsAt, revokedAt }) => ({
      key: id,
      line: [
        `${SANCTION_KINDS[kind]} for ${CAUSES[cause]}, ${formatInstant(startedAt)}`,
        endsAt === null ? null : `until ${formatInstant(endsAt)}`,
        revokedAt === null ? null : `revoked ${formatInstant(revokedAt)}`,
      ]
        .filter((part) => part !== null)
        .join(", "),
    })),
  };
}
