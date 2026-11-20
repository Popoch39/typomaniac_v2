import { FIRST_SUSPENSION_MS, LONGER_SUSPENSION_MS } from "./constants.ts";

/** A Sanction applied automatically for a Violation, in rising order (ADR 0014). */
export type ViolationSanction =
  | { readonly kind: "voided_duel" }
  | { readonly kind: "suspension"; readonly lengthMs: number }
  | { readonly kind: "ban" };

/**
 * VIOLATION-1: the Sanction due for a Player's next Violation, given how many of their Violations
 * were sanctioned before it, several in one Duel counting as one.
 */
export const nextViolationSanction = (sanctionedViolations: number): ViolationSanction => {
  if (sanctionedViolations === 0) return { kind: "voided_duel" };
  if (sanctionedViolations === 1) return { kind: "suspension", lengthMs: FIRST_SUSPENSION_MS };
  if (sanctionedViolations === 2) return { kind: "suspension", lengthMs: LONGER_SUSPENSION_MS };
  return { kind: "ban" };
};
