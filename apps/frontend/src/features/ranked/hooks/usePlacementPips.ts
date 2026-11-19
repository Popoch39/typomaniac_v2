import type { Outcome } from "@repo/ranked-engine";

/** One pip per Placement Duel, with its Outcome once played, `null` before. */
export function usePlacementPips(outcomes: readonly Outcome[], total: number) {
  return Array.from({ length: total }, (_, index) => ({
    number: index + 1,
    outcome: outcomes[index] ?? null,
  }));
}
