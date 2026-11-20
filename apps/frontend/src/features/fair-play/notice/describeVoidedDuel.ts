/** A Voided Duel as the API tells one of its Players: the LP it gave back (positive) or took (negative). */
export type VoidedDuel = {
  readonly duelId: string;
  readonly voidedAt: number;
  readonly opponentNickname: string | null;
  readonly opponentBanned: boolean;
  readonly lp: number;
  /** Set only for a Duel voided against the Player as their Sanction. */
  readonly appealAddress: string | null;
};

const describeLp = (lp: number) => {
  if (lp > 0) return `you got ${lp} LP back`;
  if (lp < 0) return `${-lp} LP were taken back`;
  return "your LP did not change";
};

/** The sentence telling a Player that a ranked Duel of theirs was voided and what it did to their LP. */
export function describeVoidedDuel({ opponentNickname, opponentBanned, lp }: VoidedDuel): string {
  const opponent = `${opponentNickname ?? "an Opponent"}${opponentBanned ? ", since banned," : ""}`;
  return `Your ranked Duel against ${opponent} was voided: ${describeLp(lp)}.`;
}

/** Where the Player at fault contests a Duel voided against them; null for the Opponent's repair. */
export function voidedDuelAppeal({ appealAddress }: VoidedDuel) {
  return appealAddress === null ? null : { appealAddress, appealLink: `mailto:${appealAddress}` };
}
