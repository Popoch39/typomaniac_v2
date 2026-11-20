import type { Tier } from "@repo/ranked-engine";
import { tierName } from "../../ranked/standing/rankName.ts";

export interface ProgressSummary {
  /** The Duels of the period and kind chosen, by their Duel Outcome for the Player. */
  won: number;
  lost: number;
  drawn: number;
}

export type DuelOutcome = keyof ProgressSummary;

export interface ProgressSummaryLine {
  outcome: DuelOutcome;
  label: string;
  count: number;
}

/** The Duels won over every Duel played, draws included, from 0 to 1; `null` without any Duel. */
export function winRate({ won, lost, drawn }: ProgressSummary) {
  const played = won + lost + drawn;
  return played === 0 ? null : won / played;
}

/** The win rate in whole percents, or a dash without any Duel, so that its line is never empty. */
export function winRateLabel(summary: ProgressSummary) {
  const rate = winRate(summary);
  return rate === null ? "–" : `${Math.round(rate * 100)}%`;
}

/** The Duels won, lost and drawn, always the same three, so that the summary's box holds whatever the period. */
export function progressSummaryLines(summary: ProgressSummary): ProgressSummaryLine[] {
  return [
    { outcome: "won", label: "Won", count: summary.won },
    { outcome: "lost", label: "Lost", count: summary.lost },
    { outcome: "drawn", label: "Drawn", count: summary.drawn },
  ];
}

/** The Peak Tier's name, or that the Player has none yet before their first Rank. */
export function peakTierLine(peakTier: Tier | null) {
  return peakTier === null ? "No Tier yet" : tierName(peakTier);
}
