import type { useDuelRoundDetails } from "../hooks/useDuelRoundDetails.ts";
import { DuelWpmCurve } from "./DuelWpmCurve.tsx";

interface DuelRoundChartProps {
  number: number;
  chart: NonNullable<ReturnType<typeof useDuelRoundDetails>>["chart"];
}

export function DuelRoundChart({ number, chart }: DuelRoundChartProps) {
  const { plot } = chart;
  const bottom = plot.top + plot.height;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <h2 className="m-0 font-mono text-xs font-bold tracking-[.16em] text-ink-subtle uppercase">
        WPM · Round {number}
      </h2>
      {/* A fixed height, whatever the width of its column, so the band below never moves. */}
      <svg
        role="img"
        aria-label={chart.label}
        viewBox="0 0 520 120"
        className="h-30 w-full max-w-130 font-mono text-xs font-bold"
      >
        <g className="fill-ink-subtle">
          {chart.gridlines.map(({ wpm, y }) => (
            <g key={wpm}>
              <line
                x1={plot.left}
                y1={plot.top + y}
                x2={plot.left + plot.width}
                y2={plot.top + y}
                strokeWidth={2}
                className="stroke-key-face"
              />
              <text x={plot.left - 8} y={plot.top + y} dominantBaseline="middle" textAnchor="end">
                {wpm}
              </text>
            </g>
          ))}
          {chart.times.map(({ second, x }) => (
            <text key={second} x={plot.left + x} y={bottom + 18} textAnchor="middle">
              {second}s
            </text>
          ))}
        </g>
        <g transform={`translate(${plot.left} ${plot.top})`}>
          {chart.curves.map((curve) => (
            <DuelWpmCurve key={curve.className} curve={curve} />
          ))}
        </g>
      </svg>
    </div>
  );
}
