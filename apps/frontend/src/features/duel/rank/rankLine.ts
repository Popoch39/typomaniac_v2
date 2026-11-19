import type { Seat } from "@repo/duel-engine";
import type { Rank } from "@repo/ranked-engine";
import { rankName } from "../../ranked/standing/rankName.ts";

/**
 * The line under the name of the Participant on `seat`: "Disconnected" while they are away, since
 * it explains why they stopped typing; otherwise in a ranked Duel their Rank with its LP, or
 * "Unranked" when they have none; `null` in a Custom Duel, whose `ranks` are `null`: it shows no
 * Rank.
 */
export function rankLine(
  ranks: readonly [Rank | null, Rank | null] | null,
  seat: Seat,
  connected: boolean,
): string | null {
  if (!connected) return "Disconnected";
  if (ranks === null) return null;
  const rank = ranks[seat];
  return rank === null ? "Unranked" : `${rankName(rank)} · ${rank.lp} LP`;
}
