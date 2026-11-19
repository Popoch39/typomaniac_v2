import { expect, test } from "bun:test";
import { wpmChart } from "../src/features/duel/chart/wpmChart.ts";
import { wpmGridlines } from "../src/features/duel/chart/wpmGridlines.ts";

test("a chart with nothing drawn has no gridline", () => {
  expect(wpmGridlines(null, 100)).toEqual([]);
});

test("gridlines fall on round WPM values inside the scale, at the height the curves use", () => {
  expect(wpmGridlines({ min: 85, max: 115 }, 30)).toEqual([
    { wpm: 90, y: 25 },
    { wpm: 100, y: 15 },
    { wpm: 110, y: 5 },
  ]);
});

test("a narrow scale gets closer gridlines", () => {
  expect(wpmGridlines({ min: 101, max: 106 }, 50).map(({ wpm }) => wpm)).toEqual([102, 104, 106]);
});

test("a wide scale gets wider gridlines", () => {
  expect(wpmGridlines({ min: 0, max: 120 }, 120).map(({ wpm }) => wpm)).toEqual([0, 50, 100]);
});

test("a flat scale has one gridline through the middle, where its curves run", () => {
  expect(wpmGridlines({ min: 60, max: 60 }, 40)).toEqual([{ wpm: 60, y: 20 }]);
});

test("a gridline sits exactly on a curve point of the same WPM", () => {
  const chart = wpmChart(
    [
      [80, 100, 120],
      [90, 95, 110],
    ],
    { width: 30, height: 64, seconds: 30 },
  );

  const at100 = wpmGridlines(chart.scale, 64).find(({ wpm }) => wpm === 100);

  expect(at100?.y).toBe(chart.curves[0].points[1]?.y);
});
