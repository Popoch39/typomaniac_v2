import { expect, test } from "bun:test";
import { wpmChart } from "../src/features/duel/chart/wpmChart.ts";

// One pixel per second on the time axis and one per WPM point when the scale spans 20.
const box = { width: 30, height: 20, seconds: 30 };

test("empty histories draw no curve, no marker and no scale", () => {
  expect(wpmChart([[], []], box)).toEqual({
    curves: [
      { points: [], last: null },
      { points: [], last: null },
    ],
    scale: null,
  });
});

test("a partial history covers only the seconds played of the whole Round's time axis", () => {
  const chart = wpmChart([[40, 50, 60], []], { width: 300, height: 20, seconds: 30 });

  expect(chart.curves[0].points.map(({ x }) => x)).toEqual([10, 20, 30]);
});

test("both curves share one WPM scale fitted to their values", () => {
  const chart = wpmChart(
    [
      [100, 110],
      [90, 95],
    ],
    box,
  );

  expect(chart.scale).toEqual({ min: 90, max: 110 });
  expect(chart.curves[0].points).toEqual([
    { x: 1, y: 10 },
    { x: 2, y: 0 },
  ]);
  expect(chart.curves[1].points).toEqual([
    { x: 1, y: 20 },
    { x: 2, y: 15 },
  ]);
});

test("a flat curve runs through the middle of the chart", () => {
  const chart = wpmChart([[50, 50], []], box);

  expect(chart.scale).toEqual({ min: 50, max: 50 });
  expect(chart.curves[0].points).toEqual([
    { x: 1, y: 10 },
    { x: 2, y: 10 },
  ]);
});

test("a live head is placed after its curve's seconds, at the time it was read", () => {
  const chart = wpmChart(
    [
      [100, 110],
      [90, 95],
    ],
    box,
    [
      { seconds: 2.5, wpm: 105 },
      { seconds: 2.5, wpm: 100 },
    ],
  );

  expect(chart.curves[0].points).toEqual([
    { x: 1, y: 10 },
    { x: 2, y: 0 },
    { x: 2.5, y: 5 },
  ]);
  expect(chart.curves[1].points.at(-1)).toEqual({ x: 2.5, y: 10 });
});

test("the live heads take part in the shared WPM scale", () => {
  const chart = wpmChart(
    [
      [100, 110],
      [90, 95],
    ],
    box,
    [
      { seconds: 2.5, wpm: 120 },
      { seconds: 2.5, wpm: 80 },
    ],
  );

  expect(chart.scale).toEqual({ min: 80, max: 120 });
});

test("each curve's marker sits on its live head", () => {
  const chart = wpmChart([[100, 110], []], box, [
    { seconds: 2.5, wpm: 105 },
    { seconds: 0.5, wpm: 90 },
  ]);

  expect(chart.curves[0].last).toEqual({ x: 2.5, y: 5 });
  expect(chart.curves[1].last).toEqual({ x: 0.5, y: 20 });
});

test("an empty reading without live heads draws nothing", () => {
  expect(wpmChart([[], []], box, [null, null]).scale).toBeNull();
});

test("each curve's marker sits on its last value", () => {
  const chart = wpmChart(
    [
      [100, 110, 105],
      [90, 95],
    ],
    box,
  );

  expect(chart.curves[0].last).toEqual({ x: 3, y: 5 });
  expect(chart.curves[1].last).toEqual({ x: 2, y: 15 });
});
