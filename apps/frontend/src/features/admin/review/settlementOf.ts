import type { ReviewEnding } from "./reviewEnding.ts";

/**
 * What settling a Review with this ending sends, or null while it cannot be sent: voiding needs at
 * least one Duel chosen.
 */
export function settlementOf(ending: ReviewEnding, chosenDuelIds: readonly string[]) {
  if (ending !== "voided_duels") return { decision: ending };
  return chosenDuelIds.length === 0 ? null : { decision: ending, duelIds: [...chosenDuelIds] };
}
