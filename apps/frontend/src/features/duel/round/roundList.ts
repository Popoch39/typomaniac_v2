import type { RoundPip, RoundPipState } from "./roundPips.ts";

export type RoundListEntry = {
  readonly number: number;
  readonly state: RoundPipState;
  readonly label: string;
  /** Both Points, the Participant's own first. */
  readonly points: string;
};

type ListedRound = {
  readonly number: number;
  /** The Participant's own side first. */
  readonly sides: readonly { readonly points: number }[];
};

/** Every finished Round with its pip and both Points, for the details band. */
export function roundList(
  rounds: readonly ListedRound[],
  pips: readonly RoundPip[],
): readonly RoundListEntry[] {
  return rounds.map(({ number, sides }) => ({
    number,
    state: pips[number - 1]?.state ?? "upcoming",
    label: pips[number - 1]?.label ?? "",
    points: sides.map((side) => side.points).join(" – "),
  }));
}
