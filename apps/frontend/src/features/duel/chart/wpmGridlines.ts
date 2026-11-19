import type { WpmChart } from "./wpmChart.ts";

export type WpmGridline = {
  readonly wpm: number;
  readonly y: number;
};

// Round steps only, so that the labels read at a glance.
const STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500];
const WIDEST_STEP = 500;
// As many as the chart's height leaves room for labels.
const MAX_GRIDLINES = 3;

/**
 * The labelled WPM gridlines of a chart `height` pixels tall drawn on `scale`: round values inside
 * the scale, placed where `wpmChart` puts a curve point of the same WPM.
 */
export function wpmGridlines(scale: WpmChart["scale"], height: number): WpmGridline[] {
  if (scale === null) return [];
  const { min, max } = scale;
  const valuesEvery = (step: number) => {
    const values = [];
    for (let wpm = Math.ceil(min / step) * step; wpm <= max; wpm += step) values.push(wpm);
    return values;
  };
  const step =
    STEPS.find((candidate) => valuesEvery(candidate).length <= MAX_GRIDLINES) ?? WIDEST_STEP;
  return valuesEvery(step).map((wpm) => ({
    wpm,
    y: max === min ? height / 2 : height - ((wpm - min) / (max - min)) * height,
  }));
}
