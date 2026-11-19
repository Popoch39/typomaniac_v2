/** Who holds the Lead, the Participant themself or their Opponent, and by how many Points. */
export type Lead = {
  readonly holder: "self" | "opponent";
  readonly points: number;
};

/** The Lead between the Participant's own Points and their Opponent's; `null` when nobody leads. */
export function lead(ownPoints: number, opponentPoints: number): Lead | null {
  if (ownPoints === opponentPoints) return null;
  return ownPoints > opponentPoints
    ? { holder: "self", points: ownPoints - opponentPoints }
    : { holder: "opponent", points: opponentPoints - ownPoints };
}
