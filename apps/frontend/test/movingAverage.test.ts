import { expect, test } from "bun:test";
import { movingAverage } from "../src/features/progress/chart/movingAverage.ts";

const averagesOf = (values: number[], span: number) =>
  movingAverage(values, span, (value) => value).map(({ average }) => average);

test("no Game has no average", () => {
  expect(averagesOf([], 10)).toEqual([]);
});

test("each point averages the Games up to it, at most the last `span` of them", () => {
  expect(averagesOf([10, 20, 30, 40, 50], 3)).toEqual([10, 15, 20, 30, 40]);
});

test("before `span` Games are played, the average covers every Game so far", () => {
  expect(averagesOf([60, 70, 80], 10)).toEqual([60, 65, 70]);
});

test("over the last 10 Games, the 11th point leaves the first Game out", () => {
  const wpm = [0, 10, 10, 10, 10, 10, 10, 10, 10, 10, 120];

  expect(averagesOf(wpm, 10).slice(-2)).toEqual([9, 21]);
});

test("each average is paired with its own item", () => {
  const games = [{ wpm: 40 }, { wpm: 60 }];

  expect(movingAverage(games, 10, ({ wpm }) => wpm)).toEqual([
    { item: { wpm: 40 }, average: 40 },
    { item: { wpm: 60 }, average: 50 },
  ]);
});
