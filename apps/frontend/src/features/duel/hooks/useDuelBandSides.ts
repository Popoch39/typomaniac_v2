import { opponentSeat, type Participant } from "@repo/duel-engine";
import type { Ornament } from "@repo/ranked-engine";
import type { AvatarPlayer } from "../../../shared/hooks/useAvatar.ts";
import { bandPoints } from "../points/bandPoints.ts";
import { lead } from "../points/lead.ts";
import { rankLine } from "../rank/rankLine.ts";
import { useDuelStore } from "../store/useDuelStore.ts";
import { useDuelLivePoints } from "./useDuelLivePoints.ts";
import { useDuelParticipants } from "./useDuelParticipants.ts";

export type BandSide = {
  /** `false` until the Participant has arrived: their slots are kept, empty. */
  readonly isKnown: boolean;
  readonly name: string;
  readonly player: AvatarPlayer;
  readonly ornament: Ornament;
  readonly rankLine: string | null;
  readonly isAway: boolean;
  readonly points: number;
  /** The Lead, only on the side of the one who holds it. */
  readonly lead: number | null;
};

const asSide = (
  participant: Participant | undefined,
  rest: Pick<BandSide, "rankLine" | "points" | "lead">,
): BandSide => ({
  isKnown: participant !== undefined,
  name: participant?.name ?? "",
  player: { nickname: participant?.name ?? null, avatarUrl: participant?.avatarUrl ?? null },
  ornament: participant?.ornament ?? null,
  isAway: participant?.connected === false,
  ...rest,
});

/**
 * Both sides of the Broadcast band, the Participant's own first: who they are, their Rank line, their
 * Points and, for the one who leads, the Lead.
 */
export function useDuelBandSides() {
  const phase = useDuelStore((state) => state.phase);
  const seat = useDuelStore((state) => state.seat);
  const ranks = useDuelStore((state) => state.ranks);
  const rounds = useDuelStore((state) => state.rounds);
  const live = useDuelLivePoints();
  const { self, opponent } = useDuelParticipants();
  if (seat === null) {
    const unknown = asSide(undefined, { rankLine: null, points: 0, lead: null });
    return { self: unknown, opponent: unknown };
  }
  const [ownPoints, opponentPoints] = bandPoints({
    isLive: phase === "running",
    live: { own: live.self.points, opponent: live.opponent.points },
    lastRound: rounds.at(-1),
    seat,
  });
  const held = lead(ownPoints, opponentPoints);
  return {
    self: asSide(self, {
      rankLine: rankLine(ranks, seat, self?.connected ?? true),
      points: ownPoints,
      lead: held?.holder === "self" ? held.points : null,
    }),
    opponent: asSide(opponent, {
      rankLine: rankLine(ranks, opponentSeat(seat), opponent?.connected ?? true),
      points: opponentPoints,
      lead: held?.holder === "opponent" ? held.points : null,
    }),
  };
}
