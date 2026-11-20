import type { Tier } from "@repo/ranked-engine";
import { tierName } from "../../ranked/standing/rankName.ts";

export interface ProgressSummary {
  /** The Duels of the period and kind chosen, by their Duel Outcome for the Player. */
  won: number;
  lost: number;
  drawn: number;
}

export interface ProgressSummaryLine {
  label: string;
  value: string;
}

/** The Duels won over every Duel played, draws included, from 0 to 1; `null` without any Duel. */
export function winRate({ won, lost, drawn }: ProgressSummary) {
  const played = won + lost + drawn;
  return played === 0 ? null : won / played;
}

/**
 * The summary's lines, always the same four, so that its box holds whatever the period: the win rate
 * reads as a dash without any Duel.
 */
export function progressSummaryLines(summary: ProgressSummary): ProgressSummaryLine[] {
  const rate = winRate(summary);
  return [
    { label: "Won", value: String(summary.won) },
    { label: "Lost", value: String(summary.lost) },
    { label: "Drawn", value: String(summary.drawn) },
    { label: "Win rate", value: rate === null ? "–" : `${Math.round(rate * 100)}%` },
  ];
}

/** The Peak Tier's name, or that the Player has none yet before their first Rank. */
export function peakTierLine(peakTier: Tier | null) {
  return peakTier === null ? "No Tier yet" : tierName(peakTier);
}
