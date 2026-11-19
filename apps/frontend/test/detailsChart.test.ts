import { expect, test } from "bun:test";
import { detailsChart } from "../src/features/duel/chart/detailsChart.ts";

const sides = [
  { name: "kaelen", wpm: 104, history: [80, 100, 110] },
  { name: "vexwyrm", wpm: 98, history: [70, 90, 95] },
] as const;

test("the details chart is labelled with both WPMs of the Round", () => {
  expect(detailsChart(2, sides).label).toBe("WPM over Round 2: kaelen 104, vexwyrm 98");
});

test("the time axis is labelled every 10 seconds over the whole Round, under the plot", () => {
  const chart = detailsChart(1, sides);

  expect(chart.times.map(({ second }) => second)).toEqual([0, 10, 20, 30]);
  expect(chart.times[0]?.x).toBe(0);
  expect(chart.times.at(-1)?.x).toBe(chart.plot.width);
  expect(chart.timeLabelY).toBeGreaterThan(chart.plot.top + chart.plot.height);
});

test("the WPM gridlines are labelled with round values inside the curves' scale", () => {
  expect(detailsChart(1, sides).gridlines.map(({ wpm }) => wpm)).toEqual([80, 100]);
});

test("the Opponent's curve is drawn first, the Participant's own on top", () => {
  expect(detailsChart(1, sides).curves.map(({ className }) => className)).toEqual([
    "text-opponent",
    "text-action",
  ]);
});
