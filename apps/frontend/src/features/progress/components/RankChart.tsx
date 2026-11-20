import { CartesianGrid, Line, LineChart, ReferenceArea, XAxis, YAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../../../shared/components/ui/chart.tsx";
import { useProgressTooltipLabel } from "../hooks/useProgressTooltipLabel.ts";
import { useRankChart } from "../hooks/useRankChart.ts";
import type { RankChartRow } from "../hooks/useRankChartPanel.ts";
import { RankChartDot } from "./RankChartDot.tsx";

const CONFIG = { ladder: { label: "Rank", color: "var(--ink)" } } satisfies ChartConfig;

interface RankChartProps {
  rows: readonly RankChartRow[];
}

/** The Rank after each ranked Duel, oldest on the left, over the bands of the Tiers it crossed. */
export function RankChart({ rows }: RankChartProps) {
  const { domain, bands, ticks, tickLabel, tooltipLine } = useRankChart(rows);
  const tooltipLabel = useProgressTooltipLabel();

  return (
    // A fixed height, whatever the width, so that the page below never moves.
    <ChartContainer config={CONFIG} className="aspect-auto h-64 w-full">
      <LineChart
        data={[...rows]}
        margin={{ top: 12, right: 12, bottom: 0, left: 0 }}
        accessibilityLayer
      >
        {bands.map(({ tier, from, to }) => (
          <ReferenceArea
            key={tier}
            y1={from}
            y2={to}
            fill={`var(--tier-${tier})`}
            fillOpacity={0.14}
            strokeOpacity={0}
          />
        ))}
        <CartesianGrid vertical={false} className="stroke-key-face" />
        <XAxis dataKey="duel" tickLine={false} axisLine={false} tickMargin={8} minTickGap={12} />
        <YAxis
          width={72}
          tickLine={false}
          axisLine={false}
          domain={domain}
          ticks={ticks}
          tickFormatter={tickLabel}
        />
        <ChartTooltip
          content={<ChartTooltipContent labelFormatter={tooltipLabel} formatter={tooltipLine} />}
        />
        <Line
          dataKey="ladder"
          type="linear"
          stroke="var(--color-ladder)"
          strokeWidth={2}
          dot={RankChartDot}
          // The hovered Duel keeps its own marker, so that a Promotion or demotion stays readable.
          activeDot={RankChartDot}
          isAnimationActive={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
