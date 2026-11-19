import { type WpmScale, wpmY } from "./wpmY.ts";

export type ChartPoint = {
  readonly x: number;
  readonly y: number;
};

export type WpmCurve = {
  readonly points: readonly ChartPoint[];
  /** The marker on the curve's last value; `null` for an empty history. */
  readonly last: ChartPoint | null;
};

export type WpmChart = {
  /** The Participant's own curve first, then the Opponent's. */
  readonly curves: readonly [WpmCurve, WpmCurve];
  /** `null` when nothing is drawn. */
  readonly scale: WpmScale | null;
};

type ChartBox = {
  readonly width: number;
  readonly height: number;
  /** The whole Round's duration: the time axis does not grow with the seconds played. */
  readonly seconds: number;
};

/**
 * Two WPM histories, one value per second, as curves in a box of `width` × `height` pixels whose
 * origin is its top-left corner. Both share one WPM scale so that they can be compared.
 */
export function wpmChart(
  histories: readonly [readonly number[], readonly number[]],
  { width, height, seconds }: ChartBox,
): WpmChart {
  const values = [...histories[0], ...histories[1]];
  if (values.length === 0) {
    const empty = { points: [], last: null };
    return { curves: [empty, empty], scale: null };
  }
  const scale = { min: Math.min(...values), max: Math.max(...values) };
  const curveOf = (history: readonly number[]): WpmCurve => {
    // A value is the WPM at the end of its second: the first sits one second along the axis.
    const points = history.map((wpm, index) => ({
      x: ((index + 1) * width) / seconds,
      y: wpmY(wpm, scale, height),
    }));
    return { points, last: points.at(-1) ?? null };
  };
  return { curves: [curveOf(histories[0]), curveOf(histories[1])], scale };
}
