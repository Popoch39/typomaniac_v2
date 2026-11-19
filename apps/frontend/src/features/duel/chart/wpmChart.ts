import { type WpmScale, wpmY } from "./wpmY.ts";

export type ChartPoint = {
  readonly x: number;
  readonly y: number;
};

/** A curve's live end, between two of its seconds. */
export type WpmHead = {
  /** The time elapsed since the Start that the WPM was read at. */
  readonly seconds: number;
  readonly wpm: number;
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
 * Two WPM histories, one value per second, each followed by its live head if it has one, as curves
 * in a box of `width` × `height` pixels whose origin is its top-left corner. Both share one WPM
 * scale so that they can be compared.
 */
export function wpmChart(
  histories: readonly [readonly number[], readonly number[]],
  { width, height, seconds }: ChartBox,
  heads: readonly [WpmHead | null, WpmHead | null] = [null, null],
): WpmChart {
  const values = [
    ...histories[0],
    ...histories[1],
    ...heads.flatMap((head) => (head === null ? [] : [head.wpm])),
  ];
  if (values.length === 0) {
    const empty = { points: [], last: null };
    return { curves: [empty, empty], scale: null };
  }
  const scale = { min: Math.min(...values), max: Math.max(...values) };
  const pointAt = ({ seconds: elapsed, wpm }: WpmHead): ChartPoint => ({
    x: (elapsed * width) / seconds,
    y: wpmY(wpm, scale, height),
  });
  const curveOf = (history: readonly number[], head: WpmHead | null): WpmCurve => {
    // A value is the WPM at the end of its second: the first sits one second along the axis.
    const points = history.map((wpm, index) => pointAt({ seconds: index + 1, wpm }));
    if (head !== null) points.push(pointAt(head));
    return { points, last: points.at(-1) ?? null };
  };
  return {
    curves: [curveOf(histories[0], heads[0]), curveOf(histories[1], heads[1])],
    scale,
  };
}
