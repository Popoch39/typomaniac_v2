import type { ProgressGame } from "../chart/progressChartRows.ts";
import { emptyProgressMessage } from "../filter/emptyProgressMessage.ts";
import { progressFilterTag } from "../filter/progressFilterTag.ts";
import { useProgressFilterStore } from "../store/useProgressFilterStore.ts";
import { useProgressChartRows } from "./useProgressChartRows.ts";

/** The chart rows of the Games read, with what the period and the kind of Duels chosen tag and say. */
export function useProgressSection(games: readonly ProgressGame[], neverPlayedMessage: string) {
  const filter = useProgressFilterStore((s) => s.filter);
  return {
    rows: useProgressChartRows(games),
    tag: progressFilterTag(filter),
    emptyMessage: emptyProgressMessage(filter, neverPlayedMessage),
  };
}
