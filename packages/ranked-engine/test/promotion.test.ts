import { expect, test } from "bun:test";
import { DEFAULT_RANKED_CONFIG, applyDuel, type Standing } from "../src/index.ts";

// Placement is over, so K is the regular K-factor, 32. A Duel against an equal opponent moves the
// MMR by 16, which lands it on the Division's reference when it starts 16 away: gap 0, 20 LP.
function ranked(mmr: number, rank: Standing["rank"]): Standing {
  return { mmr, duelsPlayed: 20, rank };
}

test("PROMO-1: a win past 100 LP promotes to the next Division, the excess carried over and the LP delta the gain applied", () => {
  // Silver II reference: 900 + 6 × 50 = 1200
  expect(applyDuel(ranked(1184, { tier: "silver", division: 2, lp: 90 }), 1184, "win")).toEqual({
    // 1184 + 16 = 1200; gap 0 → +20; 90 + 20 = 110 → Silver I at 110 − 100 = 10
    standing: { mmr: 1200, duelsPlayed: 21, rank: { tier: "silver", division: 1, lp: 10 } },
    mmrDelta: 16,
    lpDelta: 20,
    rankChange: "promoted",
  });
});

test("PROMO-1: a win that reaches exactly 100 LP promotes at 0 LP", () => {
  expect(applyDuel(ranked(1184, { tier: "silver", division: 2, lp: 80 }), 1184, "win")).toEqual({
    // 1184 + 16 = 1200; gap 0 → +20; 80 + 20 = 100 → Silver I at 100 − 100 = 0
    standing: { mmr: 1200, duelsPlayed: 21, rank: { tier: "silver", division: 1, lp: 0 } },
    mmrDelta: 16,
    lpDelta: 20,
    rankChange: "promoted",
  });
});

test("PROMO-1: a promotion from Division I leads to Division IV of the next Tier", () => {
  // Silver I reference: 900 + 7 × 50 = 1250
  expect(applyDuel(ranked(1234, { tier: "silver", division: 1, lp: 95 }), 1234, "win")).toEqual({
    // 1234 + 16 = 1250; gap 0 → +20; 95 + 20 = 115 → Gold IV at 115 − 100 = 15
    standing: { mmr: 1250, duelsPlayed: 21, rank: { tier: "gold", division: 4, lp: 15 } },
    mmrDelta: 16,
    lpDelta: 20,
    rankChange: "promoted",
  });
});

test("PROMO-1: a promotion from Diamond I leads to Master, which has no Division", () => {
  // Diamond I reference: 900 + 19 × 50 = 1850
  const update = applyDuel(ranked(1834, { tier: "diamond", division: 1, lp: 90 }), 1834, "win");

  expect(update).toEqual({
    // 1834 + 16 = 1850; gap 0 → +20; 90 + 20 = 110 → Master at 110 − 100 = 10
    standing: { mmr: 1850, duelsPlayed: 21, rank: { tier: "master", lp: 10 } },
    mmrDelta: 16,
    lpDelta: 20,
    rankChange: "promoted",
  });
  expect(update.standing.rank).not.toHaveProperty("division");
});

test("PROMO-3: a loss at 0 LP demotes to the Division below at 75 LP, the LP delta the loss applied", () => {
  // Silver II reference: 1200
  expect(applyDuel(ranked(1216, { tier: "silver", division: 2, lp: 0 }), 1216, "loss")).toEqual({
    // 1216 − 16 = 1200; gap 0 → −20; at 0 LP → Silver III at 75
    standing: { mmr: 1200, duelsPlayed: 21, rank: { tier: "silver", division: 3, lp: 75 } },
    mmrDelta: -16,
    lpDelta: -20,
    rankChange: "demoted",
  });
});

test("PROMO-3: a demotion from Division IV leads to Division I of the Tier below, at 75 LP", () => {
  // Silver IV reference: 900 + 4 × 50 = 1100
  expect(applyDuel(ranked(1116, { tier: "silver", division: 4, lp: 0 }), 1116, "loss")).toEqual({
    // 1116 − 16 = 1100; gap 0 → −20; at 0 LP → Bronze I at 75
    standing: { mmr: 1100, duelsPlayed: 21, rank: { tier: "bronze", division: 1, lp: 75 } },
    mmrDelta: -16,
    lpDelta: -20,
    rankChange: "demoted",
  });
});

test("PROMO-3: a draw at 0 LP does not demote", () => {
  expect(applyDuel(ranked(1200, { tier: "silver", division: 2, lp: 0 }), 1200, "draw")).toEqual({
    // 32 × (0.5 − 0.5) = 0; a draw moves no LP
    standing: { mmr: 1200, duelsPlayed: 21, rank: { tier: "silver", division: 2, lp: 0 } },
    mmrDelta: 0,
    lpDelta: 0,
    rankChange: "none",
  });
});

test("PROMO-4: a loss at 0 LP in Bronze IV leaves the Rank unchanged and loses no LP", () => {
  // Bronze IV reference: 900
  expect(applyDuel(ranked(916, { tier: "bronze", division: 4, lp: 0 }), 916, "loss")).toEqual({
    // 916 − 16 = 900; gap 0 → −20; Bronze IV at 0 LP is the floor: no LP lost
    standing: { mmr: 900, duelsPlayed: 21, rank: { tier: "bronze", division: 4, lp: 0 } },
    mmrDelta: -16,
    lpDelta: 0,
    rankChange: "none",
  });
});

test("PROMO-1, PROMO-3: the LP per Division and the demotion landing come from the configuration given", () => {
  const config = { ...DEFAULT_RANKED_CONFIG, lpPerDivision: 50, demotionLp: 40 };

  expect(
    applyDuel(ranked(1184, { tier: "silver", division: 2, lp: 40 }), 1184, "win", config),
  ).toEqual({
    // 1184 + 16 = 1200; gap 0 → +20; 40 + 20 = 60 → Silver I at 60 − 50 = 10
    standing: { mmr: 1200, duelsPlayed: 21, rank: { tier: "silver", division: 1, lp: 10 } },
    mmrDelta: 16,
    lpDelta: 20,
    rankChange: "promoted",
  });
  expect(
    applyDuel(ranked(1216, { tier: "silver", division: 2, lp: 0 }), 1216, "loss", config),
  ).toEqual({
    // 1216 − 16 = 1200; gap 0 → −20; at 0 LP → Silver III at 40
    standing: { mmr: 1200, duelsPlayed: 21, rank: { tier: "silver", division: 3, lp: 40 } },
    mmrDelta: -16,
    lpDelta: -20,
    rankChange: "demoted",
  });
});
