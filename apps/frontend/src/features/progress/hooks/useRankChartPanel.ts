import { emptyProgressMessage } from "../filter/emptyProgressMessage.ts";
import { type RankPoint, rankChartRows } from "../rank/rankChartRows.ts";
import { useProgressFilterStore } from "../store/useProgressFilterStore.ts";

export type RankChartRow = ReturnType<typeof rankChartRows>[number];

/**
 * The Rank chart's rows, or what the Panel says in the curve's place: an Unranked Player has no Rank
 * before their Placement ends, and as a Custom Duel never moves the Rank, only the period chosen can
 * leave a ranked Player without a point.
 */
export function useRankChartPanel(
  points: readonly RankPoint[],
  isUnranked: boolean,
  neverPlayedMessage: string,
) {
  const window = useProgressFilterStore((s) => s.filter.window);
  const rows = rankChartRows(points);
  let message: string | null = null;
  if (isUnranked) message = "Rank after Placement";
  else if (rows.length === 0)
    message = emptyProgressMessage({ window, kind: "ranked" }, neverPlayedMessage);
  return { rows, message };
}
