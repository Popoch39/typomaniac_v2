import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "../../../shared/components/ui/chart.tsx";
import { cn } from "../../../shared/lib/utils.ts";
import type { ProgressChartRow } from "../hooks/useProgressChartRows.ts";
import { useProgressTooltipLabel } from "../hooks/useProgressTooltipLabel.ts";

export type ProgressSeries = Exclude<keyof ProgressChartRow, "game" | "endedAt">;

interface ProgressChartProps {
  rows: readonly ProgressChartRow[];
  /** Each series' label and theme colour, by its key. */
  config: ChartConfig;
  series: readonly { key: ProgressSeries; isTrend?: boolean }[];
  /** Said in the chart's place while there is no Game. */
  emptyMessage: string;
  /** The chart's height, the same with or without Games, so that the page below never moves. */
  className: string;
}

/** One point per Game, oldest on the left. */
export function ProgressChart({
  rows,
  config,
  series,
  emptyMessage,
  className,
}: ProgressChartProps) {
  const tooltipLabel = useProgressTooltipLabel();

  if (rows.length === 0) {
    return (
      <p
        className={cn("m-0 flex items-center justify-center text-center text-ink-muted", className)}
      >
        {emptyMessage}
      </p>
    );
  }
  return (
    <ChartContainer config={config} className={cn("aspect-auto w-full", className)}>
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
