import type { ProgressFilter, ProgressKind, ProgressWindow } from "./progressFilter.ts";

const WINDOW_TAGS: Record<ProgressWindow, string> = {
  "20-duels": "Last 20 Duels",
  "30-days": "Last 30 days",
  all: "All Duels",
};

const KIND_TAGS: Record<Exclude<ProgressKind, "all">, string> = {
  ranked: "Ranked",
  custom: "Custom",
};

/** What a chart of the Progress covers, as the tag of its Panel. */
export function progressFilterTag({ window, kind }: ProgressFilter) {
  return kind === "all" ? WINDOW_TAGS[window] : `${KIND_TAGS[kind]} · ${WINDOW_TAGS[window]}`;
}
