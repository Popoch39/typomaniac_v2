import type { ChartPoint } from "../chart/wpmChart.ts";

interface DuelWpmCurveProps {
  curve: {
    readonly polyline: string;
    readonly last: ChartPoint | null;
    /** The Participant's colour, which the line and its marker take. */
    readonly className: string;
  };
}

export function DuelWpmCurve({ curve }: DuelWpmCurveProps) {
  return (
    <g className={curve.className}>
      <polyline
        points={curve.polyline}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {curve.last && (
        <rect
          x={curve.last.x - 4}
          y={curve.last.y - 4}
          width={8}
          height={8}
          fill="currentColor"
          strokeWidth={2}
          className="stroke-key-outline"
        />
      )}
    </g>
  );
}
