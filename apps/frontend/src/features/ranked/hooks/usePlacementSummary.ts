/** The Placement Duels left before the Rank is revealed, in words. */
export function usePlacementSummary(played: number, total: number) {
  const left = Math.max(0, total - played);
  return {
    hint: `Play ${left} more Placement ${left === 1 ? "Duel" : "Duels"} to reveal your Rank.`,
  };
}
