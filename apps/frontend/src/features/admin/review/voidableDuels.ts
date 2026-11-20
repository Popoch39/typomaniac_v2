/**
 * The reviewed Player's Duels the administrator may choose to void: only those they won, since a Duel
 * the Player at fault lost or drew is left as it was (ADR 0015).
 */
export function voidableDuels<Duel extends { readonly outcome: "win" | "loss" | "draw" }>(
  duels: readonly Duel[],
) {
  return duels.filter(({ outcome }) => outcome === "win");
}
