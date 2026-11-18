import { opponentSeat, type Seat } from "@repo/duel-engine";
import type { Rank } from "@repo/ranked-engine";
import { rankName } from "../../ranked/standing/rankName.ts";

/**
 * The name of the Opponent's Rank in a ranked Duel, "Unranked" when they have none; `null` in a
 * Custom Duel, whose `ranks` are `null`: it shows no Rank.
 */
export function opponentRankName(
  ranks: readonly [Rank | null, Rank | null] | null,
  seat: Seat,
): string | null {
  if (ranks === null) return null;
  const rank = ranks[opponentSeat(seat)];
  return rank === null ? "Unranked" : rankName(rank);
}
