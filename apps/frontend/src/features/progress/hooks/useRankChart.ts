import { tierName } from "../../ranked/standing/rankName.ts";
import type { HoveredPoint } from "../chart/hoveredPoint.ts";
import { ladderDomain, tierBands } from "../rank/tierBands.ts";
import type { RankChartRow } from "./useRankChartPanel.ts";

/** The ladder the Rank chart shows, its Tier bands, and an axis that names each Tier where it starts. */
export function useRankChart(rows: readonly RankChartRow[]) {
  const domain = ladderDomain(rows.map(({ ladder }) => ladder));
  const bands = tierBands(domain);
  const tierStarts = new Map(bands.map(({ tier, from }) => [from, tierName(tier)]));
  return {
    domain,
    bands,
    ticks: bands.map(({ from }) => from),
    tickLabel: (value: number) => tierStarts.get(value) ?? "",
    // The Rank and its change, not the ladder value, which only places the point.
    tooltipLine: (_value: unknown, _name: unknown, item: HoveredPoint) => item.payload?.line,
  };
}
