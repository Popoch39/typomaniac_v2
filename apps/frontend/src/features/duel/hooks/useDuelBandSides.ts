import { getPoints, opponentSeat } from "@repo/duel-engine";
import { lead } from "../points/lead.ts";
import { rankLine } from "../rank/rankLine.ts";
import { useDuelStore } from "../store/useDuelStore.ts";
import { useDuelLivePoints } from "./useDuelLivePoints.ts";
import { useDuelParticipants } from "./useDuelParticipants.ts";

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
  if (seat === null) return null;
  const otherSeat = opponentSeat(seat);
  const lastRound = rounds.at(-1);
  // Live during a Round; outside one, the last finished Round stays in view, and nothing before Round 1.
  const [ownPoints, opponentPoints] =
    phase === "running"
      ? [live.self.points, live.opponent.points]
      : lastRound === undefined
        ? [0, 0]
        : [getPoints(lastRound.results[seat]), getPoints(lastRound.results[otherSeat])];
  const held = lead(ownPoints, opponentPoints);
  return {
    self: {
      participant: self,
      rankLine: rankLine(ranks, seat, self?.connected ?? true),
      isAway: self?.connected === false,
      points: ownPoints,
      lead: held?.holder === "self" ? held.points : null,
    },
    opponent: {
      participant: opponent,
      rankLine: rankLine(ranks, otherSeat, opponent?.connected ?? true),
      isAway: opponent?.connected === false,
      points: opponentPoints,
      lead: held?.holder === "opponent" ? held.points : null,
    },
  };
}
