/** Elo expected score: the share of the Duel the Player is expected to win against this opponent. */
export function expectedScore(mmr: number, opponentMmr: number): number {
  return 1 / (1 + 10 ** ((opponentMmr - mmr) / 400));
}

export function nextMmr(mmr: number, opponentMmr: number, score: number, kFactor: number): number {
  return Math.max(0, mmr + Math.round(kFactor * (score - expectedScore(mmr, opponentMmr))));
}
