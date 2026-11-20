/** The Duels a Progress covers: the last 20, those ended in the last 30 days, or all of them. */
export type ProgressWindow = "20-duels" | "30-days" | "all";

/** The kind of Duels a Progress keeps: every one, or only ranked or only Custom ones. */
export type ProgressKind = "all" | "ranked" | "custom";

export interface ProgressFilter {
  window: ProgressWindow;
  kind: ProgressKind;
}

/** Recent form first, over all the Player's typing. */
export const DEFAULT_PROGRESS_FILTER: ProgressFilter = { window: "20-duels", kind: "all" };

export const PROGRESS_WINDOWS: readonly { value: ProgressWindow; label: string }[] = [
  { value: "20-duels", label: "20 Duels" },
  { value: "30-days", label: "30 days" },
  { value: "all", label: "All" },
];

export const PROGRESS_KINDS: readonly { value: ProgressKind; label: string }[] = [
  { value: "all", label: "All" },
  { value: "ranked", label: "Ranked" },
  { value: "custom", label: "Custom" },
];
