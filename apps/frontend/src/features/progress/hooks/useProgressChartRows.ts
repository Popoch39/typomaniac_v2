import { type ProgressGame, progressChartRows } from "../chart/progressChartRows.ts";

export type ProgressChartRow = ReturnType<typeof progressChartRows>[number];

export function useProgressChartRows(games: readonly ProgressGame[]) {
  return progressChartRows(games);
}
