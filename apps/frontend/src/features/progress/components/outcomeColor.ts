import type { DuelOutcome } from "../summary/progressSummary.ts";

/** Each Duel Outcome's colour: the lime of the win, the red of the defeat, a grey for the draw. */
export const OUTCOME_COLOR: Record<DuelOutcome, string> = {
  won: "bg-action",
  lost: "bg-danger",
  drawn: "bg-ink-subtle",
};
