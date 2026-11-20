import { describeVoidedDuel, type VoidedDuel } from "../notice/describeVoidedDuel.ts";

export function useVoidedDuelNotice(voidedDuels: readonly VoidedDuel[]) {
  return voidedDuels.map((voided) => ({ key: voided.duelId, text: describeVoidedDuel(voided) }));
}
