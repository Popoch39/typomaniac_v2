import { expect, test } from "bun:test";
import { progressChartRows } from "../src/features/progress/chart/progressChartRows.ts";

const game = (endedAt: number, wpm: number) => ({
  endedAt,
  kind: "ranked" as const,
  wpm,
  rawWpm: wpm + 5,
  accuracy: 95,
  consistency: 80,
});

test("no Game draws no point", () => {
  expect(progressChartRows([])).toEqual([]);
});

test("each Game is a point numbered from 1, with its measures, its Duel's end and the WPM averaged over the last 10 Games", () => {
  expect(progressChartRows([game(1000, 60), game(2000, 70), game(3000, 81)])).toEqual([
    { game: 1, endedAt: 1000, wpm: 60, rawWpm: 65, accuracy: 95, consistency: 80, averageWpm: 60 },
    { game: 2, endedAt: 2000, wpm: 70, rawWpm: 75, accuracy: 95, consistency: 80, averageWpm: 65 },
    {
      game: 3,
      endedAt: 3000,
      wpm: 81,
      rawWpm: 86,
      accuracy: 95,
      consistency: 80,
      averageWpm: 70.33,
    },
  ]);
});

test("the average leaves out the Games before the last 10", () => {
  const games = [0, 10, 10, 10, 10, 10, 10, 10, 10, 10, 120].map((wpm, index) => game(index, wpm));

  expect(
    progressChartRows(games)
      .map(({ averageWpm }) => averageWpm)
      .slice(-2),
  ).toEqual([9, 21]);
});
