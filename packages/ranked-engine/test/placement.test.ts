import { expect, test } from "bun:test";
import { applyDuel, createStanding } from "../src/index.ts";

test("PLACE-1: Placement Duels leave the Player Unranked and move no LP, whatever the Outcome", () => {
  const first = applyDuel(createStanding(), 1300, "win");
  const second = applyDuel(first.standing, 1100, "loss");
  const third = applyDuel(second.standing, 1500, "draw");
  const fourth = applyDuel(third.standing, 1200, "loss");

  expect([first, second, third, fourth]).toEqual([
    {
      // Expected 1 / (1 + 10^(100 / 400)) = 0.35994: 64 × (1 − 0.35994) = 40.96 → 41
      standing: { mmr: 1241, duelsPlayed: 1, rank: null },
      mmrDelta: 41,
      lpDelta: 0,
      rankChange: "none",
    },
    {
      // Expected 1 / (1 + 10^(−141 / 400)) = 0.69246: 64 × (0 − 0.69246) = −44.32 → −44
      standing: { mmr: 1197, duelsPlayed: 2, rank: null },
      mmrDelta: -44,
      lpDelta: 0,
      rankChange: "none",
    },
    {
      // Expected 1 / (1 + 10^(303 / 400)) = 0.14878: 64 × (0.5 − 0.14878) = 22.48 → 22
      standing: { mmr: 1219, duelsPlayed: 3, rank: null },
      mmrDelta: 22,
      lpDelta: 0,
      rankChange: "none",
    },
    {
      // Expected 1 / (1 + 10^(−19 / 400)) = 0.52732: 64 × (0 − 0.52732) = −33.75 → −34
      standing: { mmr: 1185, duelsPlayed: 4, rank: null },
      mmrDelta: -34,
      lpDelta: 0,
      rankChange: "none",
    },
  ]);
});
