import type { OwnStanding } from "../../ranked/standing/describeStanding.ts";

/** A ranked Player's Standing, the usual one, for the dev pages. */
export const standingFixture: OwnStanding = {
  rank: { tier: "gold", division: 2, lp: 64 },
  placement: { played: 5, total: 5, outcomes: ["win", "win", "loss", "draw", "win"] },
};
