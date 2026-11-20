import { movingAverage } from "./movingAverage.ts";

// The Games the WPM trend averages: enough to smooth single Games out, few enough to follow form.
const AVERAGE_SPAN = 10;

export interface ProgressGame {
  /** The end of the Game's Duel, in milliseconds since the epoch. */
  endedAt: number;
  kind: "ranked" | "custom";
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
}

/** One point per Game, oldest first, numbered from 1, with the WPM trend over the last Games. */
export function progressChartRows(games: readonly ProgressGame[]) {
  return movingAverage(games, AVERAGE_SPAN, ({ wpm }) => wpm).map(
    ({ item: { endedAt, wpm, rawWpm, accuracy, consistency }, average }, index) => ({
      game: index + 1,
      endedAt,
      wpm,
      rawWpm,
      accuracy,
      consistency,
      // Two decimals, as the server rounds every measure.
      averageWpm: Math.round(average * 100) / 100,
    }),
  );
}
