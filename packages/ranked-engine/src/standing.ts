import { DEFAULT_RANKED_CONFIG, type RankedConfig } from "./config.ts";
import type { Standing } from "./types.ts";

export function createStanding(config: RankedConfig = DEFAULT_RANKED_CONFIG): Standing {
  return { mmr: config.initialMmr, duelsPlayed: 0, rank: null };
}
