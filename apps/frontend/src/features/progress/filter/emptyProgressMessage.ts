import type { ProgressFilter, ProgressKind } from "./progressFilter.ts";

const KIND_NAMES: Record<ProgressKind, string> = {
  all: "Duel",
  ranked: "ranked Duel",
  custom: "Custom Duel",
};

/**
 * What a Progress without any Game says: `neverPlayed` when the Player has not played a Duel at all,
 * otherwise which Duels the period and the filter found none of.
 */
export function emptyProgressMessage({ window, kind }: ProgressFilter, neverPlayed: string) {
  if (window === "30-days") return `No ${KIND_NAMES[kind]} in the last 30 days.`;
  return kind === "all" ? neverPlayed : `No ${KIND_NAMES[kind]} played yet.`;
}
