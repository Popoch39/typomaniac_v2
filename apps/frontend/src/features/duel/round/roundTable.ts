import type { Result } from "@repo/typing-engine";

export type RoundTableRow = {
  readonly label: string;
  /** The Participant's own value first. */
  readonly values: readonly [string, string];
};

const percent = (value: number) => `${Math.round(value)}%`;

/** The rows of a finished Round's table: WPM, Accuracy and Consistency, the Participant's own first. */
export function roundTable(own: Result, opponent: Result): readonly RoundTableRow[] {
  return [
    { label: "WPM", values: [String(Math.round(own.wpm)), String(Math.round(opponent.wpm))] },
    { label: "Accuracy", values: [percent(own.accuracy), percent(opponent.accuracy)] },
    { label: "Consistency", values: [percent(own.consistency), percent(opponent.consistency)] },
  ];
}
