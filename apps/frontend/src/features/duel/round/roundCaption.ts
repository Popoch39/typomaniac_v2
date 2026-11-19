import type { Outcome } from "@repo/duel-engine";

type CaptionSide = {
  readonly name: string;
  readonly points: number;
};

/**
 * How a finished Round is headed, from the summary of it seen from either seat: its winner and the
 * Points, the winner's first, so that both Participants read the same caption.
 */
export function roundCaption({
  number,
  outcome,
  sides: [own, opponent],
}: {
  readonly number: number;
  /** The Outcome of the Participant whose side comes first. */
  readonly outcome: Outcome;
  /** Both sides, the one whose Outcome is given first. */
  readonly sides: readonly CaptionSide[];
}) {
  if (own === undefined || opponent === undefined) return `Round ${number}`;
  if (outcome === "draw")
    return `Round ${number} drawn · ${own.points} to ${opponent.points} Points`;
  const [winner, loser] = outcome === "win" ? [own, opponent] : [opponent, own];
  return `Round ${number} to ${winner.name} · ${winner.points} to ${loser.points} Points`;
}
