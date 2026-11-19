/** One pip per Placement Duel, the first ones played. The API does not tell their outcomes. */
export function usePlacementPips(played: number, total: number) {
  return Array.from({ length: total }, (_, index) => ({
    number: index + 1,
    isPlayed: index < played,
  }));
}
