import type { PairingSide } from "@repo/matchmaking-engine";
import { rankName } from "../../ranked/standing/rankName.ts";

export function usePairingSide({ rank }: PairingSide) {
  return { rankLabel: rank === null ? "Unranked" : rankName(rank) };
}
