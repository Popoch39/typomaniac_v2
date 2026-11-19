import { expect, test } from "bun:test";
import { drawnCurves } from "../src/features/duel/chart/drawnCurves.ts";
import { wpmChart } from "../src/features/duel/chart/wpmChart.ts";

test("the Opponent's curve comes first, in their colour, so the Participant's own is drawn on top", () => {
  const chart = wpmChart(
    [
      [100, 110],
      [90, 95],
    ],
    { width: 30, height: 20, seconds: 30 },
  );

  expect(drawnCurves(chart)).toEqual([
    { polyline: "1,20 2,15", last: { x: 2, y: 15 }, className: "text-opponent" },
    { polyline: "1,10 2,0", last: { x: 2, y: 0 }, className: "text-action" },
  ]);
});

test("empty histories are drawn as empty curves without a marker", () => {
  const chart = wpmChart([[], []], { width: 30, height: 20, seconds: 30 });

  expect(drawnCurves(chart).map(({ polyline, last }) => ({ polyline, last }))).toEqual([
    { polyline: "", last: null },
    { polyline: "", last: null },
  ]);
});
