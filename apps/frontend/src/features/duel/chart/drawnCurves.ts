import { asPolyline } from "./asPolyline.ts";
import type { ChartPoint, WpmChart } from "./wpmChart.ts";

/** A WPM curve ready to draw: its line, the marker on its last value and its Participant's colour. */
export type DrawnCurve = {
  readonly polyline: string;
  readonly last: ChartPoint | null;
  /** The Participant's colour, which the line and its marker take. */
  readonly className: string;
};

/** Both curves of a chart, the Opponent's first, so that the Participant's own is drawn on top of it. */
export function drawnCurves({ curves: [own, opponent] }: WpmChart): readonly DrawnCurve[] {
  return [
    { polyline: asPolyline(opponent.points), last: opponent.last, className: "text-opponent" },
    { polyline: asPolyline(own.points), last: own.last, className: "text-action" },
  ];
}
