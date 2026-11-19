import type { ChartPoint } from "./wpmChart.ts";

/** Chart points as the `points` attribute of an SVG polyline. */
export const asPolyline = (points: readonly ChartPoint[]) =>
  points.map(({ x, y }) => `${x},${y}`).join(" ");
