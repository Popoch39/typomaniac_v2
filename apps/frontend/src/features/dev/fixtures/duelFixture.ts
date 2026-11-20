import type { Participant } from "@repo/duel-engine";

const self: Participant = {
  seat: 0,
  name: "Lumen",
  avatarUrl: null,
  ornament: { tier: "gold", division: 1 },
  connected: true,
};

/** The waiting screen of a Duel just opened, as the Participant who opened it sees it. */
export const duelWaitingFixture = {
  participants: { self, opponent: undefined, opponentAway: false, opponentRank: null },
  link: "http://localhost:5173/duel/3f9c2a7e-5b1d-4e8a-9c64-2d7f1b0e8a55",
};

export const duelRefusalFixture = "This Duel is full: two Participants are already in it.";
