import type { Result } from "@repo/typing-engine";
import { formatMultiplier } from "../points/formatMultiplier.ts";

export type RoundTableRow = {
  readonly label: string;
  /** The Participant's own value first. */
  readonly values: readonly [string, string];
};

type TableSide = { readonly result: Result; readonly multiplier: number };

const percent = (value: number) => `${Math.round(value)}%`;

/**
 * The rows of a finished Round's table: WPM, Accuracy, the average Multiplier and Consistency, the
 * Participant's own first.
 */
export function roundTable(own: TableSide, opponent: TableSide): readonly RoundTableRow[] {
  return [
    {
      label: "WPM",
      values: [String(Math.round(own.result.wpm)), String(Math.round(opponent.result.wpm))],
    },
    {
      label: "Accuracy",
      values: [percent(own.result.accuracy), percent(opponent.result.accuracy)],
    },
    {
      label: "Multiplier",
      values: [formatMultiplier(own.multiplier), formatMultiplier(opponent.multiplier)],
    },
    {
      label: "Consistency",
      values: [percent(own.result.consistency), percent(opponent.result.consistency)],
    },
  ];
}
