import type { DrawnCurve } from "../chart/drawnCurves.ts";

interface DuelWpmCurveProps {
  curve: DrawnCurve;
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
