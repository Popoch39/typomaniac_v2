import type { Outcome } from "@repo/duel-engine";
import { formatMultiplier } from "../points/formatMultiplier.ts";

type CaptionSide = {
  readonly name: string;
  readonly multiplier: number;
  readonly points: number;
};

const pointsOf = ({ points, multiplier }: CaptionSide) =>
  `${points} ${formatMultiplier(multiplier)}`;

/**
 * How a finished Round is headed, from the summary of it seen from either seat: its winner and the
 * Points, each beside the Multiplier that weighed them, the winner's first, so that both
 * Participants read the same caption.
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
    return `Round ${number} drawn · ${pointsOf(own)} to ${pointsOf(opponent)} Points`;
  const [winner, loser] = outcome === "win" ? [own, opponent] : [opponent, own];
  return `Round ${number} to ${winner.name} · ${pointsOf(winner)} to ${pointsOf(loser)} Points`;
}
