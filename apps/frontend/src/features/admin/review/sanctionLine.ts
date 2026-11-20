import { formatInstant } from "./formatInstant.ts";

/** A Sanction as the administration routes give it. */
export type SanctionRecord = {
  readonly kind: "voided_duel" | "suspension" | "ban";
  readonly cause: "violation" | "review";
  readonly startedAt: number;
  readonly endsAt: number | null;
  readonly revokedAt: number | null;
};

const KINDS = { voided_duel: "Voided Duel", suspension: "Suspension", ban: "Ban" } as const;

const CAUSES = { violation: "a Violation", review: "a Review" } as const;

/** A Sanction on one line: its kind, cause and start, then its end and its revocation, if any. */
export function sanctionLine(
  { kind, cause, startedAt, endsAt, revokedAt }: SanctionRecord,
  timeZone?: string,
) {
  return [
    `${KINDS[kind]} for ${CAUSES[cause]}, ${formatInstant(startedAt, timeZone)}`,
    endsAt === null ? null : `until ${formatInstant(endsAt, timeZone)}`,
    revokedAt === null ? null : `revoked ${formatInstant(revokedAt, timeZone)}`,
  ]
    .filter((part) => part !== null)
    .join(", ");
}
