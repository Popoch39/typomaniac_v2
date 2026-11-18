import { expect, test } from "bun:test";
import { DEFAULT_RANKED_CONFIG, applyDuel, type Standing } from "../src/index.ts";

// Silver II is 6 Divisions above Bronze IV: its reference is 900 + 6 × 50 = 1200.
// Placement is over, so K is the regular K-factor, 32.
function silverII(mmr: number, lp = 50): Standing {
  return { mmr, duelsPlayed: 20, rank: { tier: "silver", division: 2, lp } };
}

test("LP-2: with the MMR on the Division's reference, a win gives the base LP and a loss takes it", () => {
  expect(applyDuel(silverII(1184), 1184, "win")).toEqual({
    // 32 × (1 − 0.5) = 16 → 1200; gap (1200 − 1200) / 5 = 0 → 20 + 0 = +20
    standing: { mmr: 1200, duelsPlayed: 21, rank: { tier: "silver", division: 2, lp: 70 } },
    mmrDelta: 16,
    lpDelta: 20,
    rankChange: "none",
  });
  expect(applyDuel(silverII(1216), 1216, "loss")).toEqual({
    // 32 × (0 − 0.5) = −16 → 1200; gap 0 → 20 − 0 = −20
    standing: { mmr: 1200, duelsPlayed: 21, rank: { tier: "silver", division: 2, lp: 30 } },
    mmrDelta: -16,
    lpDelta: -20,
    rankChange: "none",
  });
});

test("LP-2: with the MMR above the reference, a win gives more and a loss takes less, by 1 LP per 5 MMR truncated", () => {
  expect(applyDuel(silverII(1200), 1200, "win")).toEqual({
    // 1200 + 16 = 1216; gap (1216 − 1200) / 5 = 3.2 → 3 → 20 + 3 = +23
    standing: { mmr: 1216, duelsPlayed: 21, rank: { tier: "silver", division: 2, lp: 73 } },
    mmrDelta: 16,
    lpDelta: 23,
    rankChange: "none",
  });
  expect(applyDuel(silverII(1250), 1250, "loss")).toEqual({
    // 1250 − 16 = 1234; gap (1234 − 1200) / 5 = 6.8 → 6 → 20 − 6 = −14
    standing: { mmr: 1234, duelsPlayed: 21, rank: { tier: "silver", division: 2, lp: 36 } },
    mmrDelta: -16,
    lpDelta: -14,
    rankChange: "none",
  });
});

test("LP-2: with the MMR below the reference, a win gives less and a loss takes more, the gap truncated toward 0", () => {
  expect(applyDuel(silverII(1150), 1150, "win")).toEqual({
    // 1150 + 16 = 1166; gap (1166 − 1200) / 5 = −6.8 → −6 → 20 − 6 = +14
    standing: { mmr: 1166, duelsPlayed: 21, rank: { tier: "silver", division: 2, lp: 64 } },
    mmrDelta: 16,
    lpDelta: 14,
    rankChange: "none",
  });
  expect(applyDuel(silverII(1200), 1200, "loss")).toEqual({
    // 1200 − 16 = 1184; gap (1184 − 1200) / 5 = −3.2 → −3 → 20 + 3 = −23
    standing: { mmr: 1184, duelsPlayed: 21, rank: { tier: "silver", division: 2, lp: 27 } },
    mmrDelta: -16,
    lpDelta: -23,
    rankChange: "none",
  });
});

test("LP-2: the gap is read on the MMR after the Duel's update", () => {
  // On the reference before the Duel, which would give 20 LP.
  expect(applyDuel(silverII(1200), 1400, "win")).toEqual({
    // Expected 1 / (1 + 10^(200 / 400)) = 0.24025: 32 × (1 − 0.24025) = 24.31 → 24 → 1224;
    // gap (1224 − 1200) / 5 = 4.8 → 4 → 20 + 4 = +24
    standing: { mmr: 1224, duelsPlayed: 21, rank: { tier: "silver", division: 2, lp: 74 } },
    mmrDelta: 24,
    lpDelta: 24,
    rankChange: "none",
  });
});

test("LP-2: a gain or loss is never above 30, however far the MMR is from the reference", () => {
  expect(applyDuel(silverII(1500), 1500, "win")).toEqual({
    // 1500 + 16 = 1516; gap (1516 − 1200) / 5 = 63.2 → 63 → 20 + 63 = 83, bounded to +30
    standing: { mmr: 1516, duelsPlayed: 21, rank: { tier: "silver", division: 2, lp: 80 } },
    mmrDelta: 16,
    lpDelta: 30,
    rankChange: "none",
  });
  expect(applyDuel(silverII(900), 900, "loss")).toEqual({
    // 900 − 16 = 884; gap (884 − 1200) / 5 = −63.2 → −63 → 20 + 63 = 83, bounded to −30
    standing: { mmr: 884, duelsPlayed: 21, rank: { tier: "silver", division: 2, lp: 20 } },
    mmrDelta: -16,
    lpDelta: -30,
    rankChange: "none",
  });
});

test("LP-2: a gain or loss is never below 10, however far the MMR is from the reference", () => {
  expect(applyDuel(silverII(900), 900, "win")).toEqual({
    // 900 + 16 = 916; gap (916 − 1200) / 5 = −56.8 → −56 → 20 − 56 = −36, bounded to +10
    standing: { mmr: 916, duelsPlayed: 21, rank: { tier: "silver", division: 2, lp: 60 } },
    mmrDelta: 16,
    lpDelta: 10,
    rankChange: "none",
  });
  expect(applyDuel(silverII(1500), 1500, "loss")).toEqual({
    // 1500 − 16 = 1484; gap (1484 − 1200) / 5 = 56.8 → 56 → 20 − 56 = −36, bounded to −10
    standing: { mmr: 1484, duelsPlayed: 21, rank: { tier: "silver", division: 2, lp: 40 } },
    mmrDelta: -16,
    lpDelta: -10,
    rankChange: "none",
  });
});

test("LP-3: a draw moves the MMR and leaves the LP unchanged", () => {
  expect(applyDuel(silverII(1200), 1400, "draw")).toEqual({
    // Expected 0.24025: 32 × (0.5 − 0.24025) = 8.31 → 8 → 1208; LP stay at 50
    standing: { mmr: 1208, duelsPlayed: 21, rank: { tier: "silver", division: 2, lp: 50 } },
    mmrDelta: 8,
    lpDelta: 0,
    rankChange: "none",
  });
});

test("PROMO-2: a loss larger than the current LP leaves the Player at 0 LP in the same Division", () => {
  expect(applyDuel(silverII(1216, 5), 1216, "loss")).toEqual({
    // 1216 − 16 = 1200; gap 0 → −20, from 5 LP floored at 0; the LP delta is the loss of LP-2
    standing: { mmr: 1200, duelsPlayed: 21, rank: { tier: "silver", division: 2, lp: 0 } },
    mmrDelta: -16,
    lpDelta: -20,
    rankChange: "none",
  });
});

// Temporary: promotion replaces this limit.
test("LP-2: a win stops at 99 LP, the top of the Division, while promotion does not exist", () => {
  expect(applyDuel(silverII(1184, 90), 1184, "win")).toEqual({
    // 1184 + 16 = 1200; gap 0 → +20, from 90 LP stopped at 99
    standing: { mmr: 1200, duelsPlayed: 21, rank: { tier: "silver", division: 2, lp: 99 } },
    mmrDelta: 16,
    lpDelta: 20,
    rankChange: "none",
  });
});

test("LP-1: a Master Player at 0 LP is measured against the Master threshold, one step above Diamond I", () => {
  expect(
    applyDuel({ mmr: 1884, duelsPlayed: 20, rank: { tier: "master", lp: 0 } }, 1884, "win"),
  ).toEqual({
    // 1884 + 16 = 1900; Master threshold 900 + 20 × 50 = 1900: gap 0 → +20
    standing: { mmr: 1900, duelsPlayed: 21, rank: { tier: "master", lp: 20 } },
    mmrDelta: 16,
    lpDelta: 20,
    rankChange: "none",
  });
});

test("LP-2: the base, bounds and MMR per LP come from the configuration given", () => {
  const config = {
    ...DEFAULT_RANKED_CONFIG,
    bronzeIvMmr: 1000,
    mmrPerDivision: 100,
    baseLp: 25,
    minLp: 15,
    maxLp: 35,
    mmrPerLp: 10,
  };

  // Silver II reference: 1000 + 6 × 100 = 1600
  expect(applyDuel(silverII(1600), 1600, "win", config)).toEqual({
    // 1600 + 16 = 1616; gap (1616 − 1600) / 10 = 1.6 → 1 → 25 + 1 = +26
    standing: { mmr: 1616, duelsPlayed: 21, rank: { tier: "silver", division: 2, lp: 76 } },
    mmrDelta: 16,
    lpDelta: 26,
    rankChange: "none",
  });
  expect(applyDuel(silverII(2000), 2000, "win", config)).toEqual({
    // 2000 + 16 = 2016; gap (2016 − 1600) / 10 = 41.6 → 41 → 25 + 41 = 66, bounded to +35
    standing: { mmr: 2016, duelsPlayed: 21, rank: { tier: "silver", division: 2, lp: 85 } },
    mmrDelta: 16,
    lpDelta: 35,
    rankChange: "none",
  });
  expect(applyDuel(silverII(2000), 2000, "loss", config)).toEqual({
    // 2000 − 16 = 1984; gap (1984 − 1600) / 10 = 38.4 → 38 → 25 − 38 = −13, bounded to −15
    standing: { mmr: 1984, duelsPlayed: 21, rank: { tier: "silver", division: 2, lp: 35 } },
    mmrDelta: -16,
    lpDelta: -15,
    rankChange: "none",
  });
});
