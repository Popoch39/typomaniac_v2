import type { ProgressGame } from "../chart/progressChartRows.ts";
import { emptyProgressMessage } from "../filter/emptyProgressMessage.ts";
import { useProgressFilterStore } from "../store/useProgressFilterStore.ts";
import { useProgressChartRows } from "./useProgressChartRows.ts";

/** The chart rows of the Games read, and what they say without any for the period and kind chosen. */
export function useProgressSection(games: readonly ProgressGame[], neverPlayedMessage: string) {
  const filter = useProgressFilterStore((s) => s.filter);
  return {
    rows: useProgressChartRows(games),
    emptyMessage: emptyProgressMessage(filter, neverPlayedMessage),
  };
}
