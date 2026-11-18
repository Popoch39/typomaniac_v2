import { expect, test } from "bun:test";
import { DEFAULT_RANKED_CONFIG, applyDuel, createStanding, type Standing } from "../src/index.ts";

// Last Placement Duel by default: 4 Duels played out of 5.
const LAST_PLACEMENT = { duelsPlayed: 4, rank: null };

// A draw against an equal opponent leaves the MMR unchanged, so the Player is placed on that MMR.
function placeAt(mmr: number): Standing {
  return applyDuel({ mmr, ...LAST_PLACEMENT }, mmr, "draw").standing;
}

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

test("PLACE-2: the last Placement Duel gives a first Rank at 0 LP and moves no LP", () => {
  expect(applyDuel({ mmr: 1200, ...LAST_PLACEMENT }, 1200, "win")).toEqual({
    // 64 × (1 − 0.5) = 32 → 1232; (1232 − 900) / 50 = 6.64 → 6th Division above Bronze IV: Silver II
    standing: { mmr: 1232, duelsPlayed: 5, rank: { tier: "silver", division: 2, lp: 0 } },
    mmrDelta: 32,
    lpDelta: 0,
    rankChange: "placed",
  });
});

test("LP-1: an MMR exactly on a Division's reference places in that Division", () => {
  // Gold IV is 8 Divisions above Bronze IV: 900 + 8 × 50 = 1300
  expect(placeAt(1300).rank).toEqual({ tier: "gold", division: 4, lp: 0 });
});

test("LP-1: an MMR one point below a Division's reference places in the Division under it", () => {
  // 1299 is below Gold IV (1300) and at or above Silver I (900 + 7 × 50 = 1250)
  expect(placeAt(1299).rank).toEqual({ tier: "silver", division: 1, lp: 0 });
});

test("PLACE-2: an MMR below the Bronze IV reference places in Bronze IV", () => {
  // 850 is below Bronze IV (900), the lowest Division
  expect(placeAt(850).rank).toEqual({ tier: "bronze", division: 4, lp: 0 });
});

test("PLACE-2: an MMR above the Placement ceiling places in Platinum IV", () => {
  // 1600 is Platinum II (900 + 14 × 50), above the ceiling Platinum IV (900 + 12 × 50 = 1500)
  expect(placeAt(1600).rank).toEqual({ tier: "platinum", division: 4, lp: 0 });
});

test("PLACE-2: the Placement length, MMR per Division and Placement ceiling come from the configuration given", () => {
  const config = {
    ...DEFAULT_RANKED_CONFIG,
    placementDuels: 3,
    bronzeIvMmr: 1000,
    mmrPerDivision: 100,
    placementCeiling: { tier: "gold", division: 2 } as const,
  };

  expect(applyDuel({ mmr: 1450, duelsPlayed: 2, rank: null }, 1450, "draw", config)).toEqual({
    // 3rd Duel of 3; 64 × (0.5 − 0.5) = 0 → 1450; (1450 − 1000) / 100 = 4.5 → Silver IV
    standing: { mmr: 1450, duelsPlayed: 3, rank: { tier: "silver", division: 4, lp: 0 } },
    mmrDelta: 0,
    lpDelta: 0,
    rankChange: "placed",
  });
  // (2500 − 1000) / 100 = 15 → Platinum I, above the ceiling Gold II (1000 + 10 × 100 = 2000)
  expect(
    applyDuel({ mmr: 2500, duelsPlayed: 2, rank: null }, 2500, "draw", config).standing.rank,
  ).toEqual({
    tier: "gold",
    division: 2,
    lp: 0,
  });
});

test("PLACE-2: with no Placement Duel, the first Duel places the Player", () => {
  const config = { ...DEFAULT_RANKED_CONFIG, placementDuels: 0 };

  expect(applyDuel(createStanding(config), 1200, "win", config)).toEqual({
    // No Placement, so K is the regular K-factor: 32 × (1 − 0.5) = 16 → 1216;
    // (1216 − 900) / 50 = 6.32 → Silver II
    standing: { mmr: 1216, duelsPlayed: 1, rank: { tier: "silver", division: 2, lp: 0 } },
    mmrDelta: 16,
    lpDelta: 0,
    rankChange: "placed",
  });
});

test("PLACE-2: a loss on the last Placement Duel still places, and moves no LP", () => {
  expect(applyDuel({ mmr: 1000, ...LAST_PLACEMENT }, 1000, "loss")).toEqual({
    // 64 × (0 − 0.5) = −32 → 968; (968 − 900) / 50 = 1.36 → Bronze III
    standing: { mmr: 968, duelsPlayed: 5, rank: { tier: "bronze", division: 3, lp: 0 } },
    mmrDelta: -32,
    lpDelta: 0,
    rankChange: "placed",
  });
});
