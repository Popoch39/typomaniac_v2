import type { ChartPoint } from "../chart/wpmChart.ts";
import { DuelWpmCurve } from "./DuelWpmCurve.tsx";

interface DuelWpmSparklineProps {
  sparkline: {
    readonly label: string;
    /** The Opponent's curve first, so that the Participant's own is drawn on top of it. */
    readonly curves: readonly {
      readonly polyline: string;
      readonly last: ChartPoint | null;
      readonly className: string;
    }[];
  };
}

export function DuelWpmSparkline({ sparkline }: DuelWpmSparklineProps) {
  return (
    <svg
      role="img"
      aria-label={sparkline.label}
      width={320}
      height={34}
      viewBox="0 0 320 34"
      className="shrink-0"
    >
      <line x1={0} y1={31} x2={308} y2={31} strokeWidth={2} className="stroke-key-face" />
      {/* The curves run from 7px under the top to 4px over the baseline, leaving room for their markers. */}
      <g transform="translate(0 7)">
        {sparkline.curves.map((curve) => (
          <DuelWpmCurve key={curve.className} curve={curve} />
        ))}
      </g>
    </svg>
  );
}
