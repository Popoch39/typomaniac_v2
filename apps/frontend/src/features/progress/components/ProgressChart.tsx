import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "../../../shared/components/ui/chart.tsx";
import type { ProgressChartRow } from "../hooks/useProgressChartRows.ts";
import { useProgressTooltipLabel } from "../hooks/useProgressTooltipLabel.ts";

export type ProgressSeries = Exclude<keyof ProgressChartRow, "game" | "endedAt">;

interface ProgressChartProps {
  rows: readonly ProgressChartRow[];
  /** Each series' label and theme colour, by its key. */
  config: ChartConfig;
  series: readonly { key: ProgressSeries; isTrend?: boolean }[];
}

/** One point per Game, oldest on the left. */
export function ProgressChart({ rows, config, series }: ProgressChartProps) {
  const tooltipLabel = useProgressTooltipLabel();

  return (
    // A fixed height, whatever the width, so that the page below never moves.
    <ChartContainer config={config} className="aspect-auto h-72 w-full">
      <LineChart
        data={[...rows]}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        accessibilityLayer
      >
        <CartesianGrid vertical={false} className="stroke-key-face" />
        <XAxis dataKey="game" tickLine={false} axisLine={false} tickMargin={8} minTickGap={12} />
        <YAxis width={36} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={tooltipLabel} />} />
        <ChartLegend content={<ChartLegendContent />} />
        {series.map(({ key, isTrend = false }) => (
          <Line
            key={key}
            dataKey={key}
            type="monotone"
            stroke={`var(--color-${key})`}
            strokeWidth={isTrend ? 3 : 2}
            strokeDasharray={isTrend ? "6 4" : undefined}
            // The trend is not a Game of its own: only the Games are dotted.
            dot={isTrend ? false : { r: 3, fill: `var(--color-${key})` }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}
