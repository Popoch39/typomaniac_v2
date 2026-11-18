import { expect, test } from "bun:test";
import { applyDuel, type Standing } from "../src/index.ts";

// Second Placement Duel: K is the Placement K-factor, 64.
const PLACEMENT: Standing = { mmr: 1200, duelsPlayed: 1, rank: null };

test("MMR-2: a win against an equal opponent raises the MMR by half the K-factor", () => {
  expect(applyDuel(PLACEMENT, 1200, "win")).toEqual({
    // 64 × (1 − 0.5) = 32
    standing: { mmr: 1232, duelsPlayed: 2, rank: null },
    mmrDelta: 32,
    lpDelta: 0,
    rankChange: "none",
  });
});

test("MMR-2: a win against a stronger opponent raises the MMR more than against a weaker one", () => {
  expect(applyDuel(PLACEMENT, 1400, "win")).toEqual({
    // Expected 1 / (1 + 10^(200 / 400)) = 0.24025: 64 × (1 − 0.24025) = 48.62 → 49
    standing: { mmr: 1249, duelsPlayed: 2, rank: null },
    mmrDelta: 49,
    lpDelta: 0,
    rankChange: "none",
  });
  expect(applyDuel(PLACEMENT, 1000, "win")).toEqual({
    // Expected 1 / (1 + 10^(−200 / 400)) = 0.75975: 64 × (1 − 0.75975) = 15.38 → 15
    standing: { mmr: 1215, duelsPlayed: 2, rank: null },
    mmrDelta: 15,
    lpDelta: 0,
    rankChange: "none",
  });
});

test("MMR-2: a loss against an equal opponent lowers the MMR by half the K-factor", () => {
  expect(applyDuel(PLACEMENT, 1200, "loss")).toEqual({
    // 64 × (0 − 0.5) = −32
    standing: { mmr: 1168, duelsPlayed: 2, rank: null },
    mmrDelta: -32,
    lpDelta: 0,
    rankChange: "none",
  });
});

test("MMR-2: a loss against a stronger opponent lowers the MMR less than against a weaker one", () => {
  expect(applyDuel(PLACEMENT, 1400, "loss")).toEqual({
    // 64 × (0 − 0.24025) = −15.38 → −15
    standing: { mmr: 1185, duelsPlayed: 2, rank: null },
    mmrDelta: -15,
    lpDelta: 0,
    rankChange: "none",
  });
  expect(applyDuel(PLACEMENT, 1000, "loss")).toEqual({
    // 64 × (0 − 0.75975) = −48.62 → −49
    standing: { mmr: 1151, duelsPlayed: 2, rank: null },
    mmrDelta: -49,
    lpDelta: 0,
    rankChange: "none",
  });
});

test("MMR-2: a draw moves the MMR toward the opponent's", () => {
  expect(applyDuel(PLACEMENT, 1400, "draw")).toEqual({
    // 64 × (0.5 − 0.24025) = 16.62 → 17
    standing: { mmr: 1217, duelsPlayed: 2, rank: null },
    mmrDelta: 17,
    lpDelta: 0,
    rankChange: "none",
  });
  expect(applyDuel(PLACEMENT, 1000, "draw")).toEqual({
    // 64 × (0.5 − 0.75975) = −16.62 → −17
    standing: { mmr: 1183, duelsPlayed: 2, rank: null },
    mmrDelta: -17,
    lpDelta: 0,
    rankChange: "none",
  });
});

test("MMR-2: a loss never takes the MMR below 0, and the MMR delta reports the change applied", () => {
  expect(applyDuel({ mmr: 10, duelsPlayed: 1, rank: null }, 10, "loss")).toEqual({
    // 64 × (0 − 0.5) = −32, floored: 10 − 32 = −22 → 0
    standing: { mmr: 0, duelsPlayed: 2, rank: null },
    mmrDelta: -10,
    lpDelta: 0,
    rankChange: "none",
  });
});

test("MMR-2: a draw against an equal opponent leaves the MMR unchanged", () => {
  expect(applyDuel(PLACEMENT, 1200, "draw")).toEqual({
    // 64 × (0.5 − 0.5) = 0
    standing: { mmr: 1200, duelsPlayed: 2, rank: null },
    mmrDelta: 0,
    lpDelta: 0,
    rankChange: "none",
  });
});
