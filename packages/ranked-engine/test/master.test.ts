import { expect, test } from "bun:test";
import { DEFAULT_RANKED_CONFIG, applyDuel, type Standing } from "../src/index.ts";
import { ranked } from "./helpers/standing.ts";

// A Duel against an equal opponent moves the MMR by 16, half the regular K-factor.
// The Master reference is 900 + 20 × 50 = 1900, plus 50 MMR per 100 LP held, rounded down.
function master(mmr: number, lp: number): Standing {
  return ranked(mmr, { tier: "master", lp });
}

test("LP-1: the Master reference adds 50 MMR per 100 LP held, rounded down", () => {
  expect(applyDuel(master(1905, 33), 1905, "win")).toEqual({
    // 1905 + 16 = 1921; reference 1900 + ⌊33 × 50 / 100⌋ = 1900 + ⌊16.5⌋ = 1916;
    // gap (1921 − 1916) / 5 = 1 → 20 + 1 = +21; 33 + 21 = 54
    standing: { mmr: 1921, duelsPlayed: 21, rank: { tier: "master", lp: 54 } },
    mmrDelta: 16,
    lpDelta: 21,
    rankChange: "none",
  });
});

test("PROMO-1: Master LP grow past 100 and keep growing, with no promotion", () => {
  expect(applyDuel(master(1929, 90), 1929, "win")).toEqual({
    // 1929 + 16 = 1945; reference 1900 + ⌊90 × 50 / 100⌋ = 1945: gap 0 → +20; 90 + 20 = 110
    standing: { mmr: 1945, duelsPlayed: 21, rank: { tier: "master", lp: 110 } },
    mmrDelta: 16,
    lpDelta: 20,
    rankChange: "none",
  });
  expect(applyDuel(master(2134, 500), 2134, "win")).toEqual({
    // 2134 + 16 = 2150; reference 1900 + ⌊500 × 50 / 100⌋ = 2150: gap 0 → +20; 500 + 20 = 520
    standing: { mmr: 2150, duelsPlayed: 21, rank: { tier: "master", lp: 520 } },
    mmrDelta: 16,
    lpDelta: 20,
    rankChange: "none",
  });
});

test("LP-2: at a given MMR, a Master Player with more LP gains fewer LP per win, within the LP bounds", () => {
  // 1984 + 16 = 2000 each time
  expect(applyDuel(master(1984, 0), 1984, "win").lpDelta).toBe(30); // reference 1900: gap 20 → 40, bounded to +30
  expect(applyDuel(master(1984, 200), 1984, "win").lpDelta).toBe(20); // reference 2000: gap 0 → +20
  expect(applyDuel(master(1984, 600), 1984, "win").lpDelta).toBe(10); // reference 2200: gap −40 → −20, bounded to +10
});

test("LP-2: at a given MMR, a Master Player with more LP loses more LP per loss, within the LP bounds", () => {
  // 2016 − 16 = 2000 each time
  expect(applyDuel(master(2016, 20), 2016, "loss").lpDelta).toBe(-10); // reference 1910: gap 18 → 2, bounded to −10
  expect(applyDuel(master(2016, 200), 2016, "loss").lpDelta).toBe(-20); // reference 2000: gap 0 → −20
  expect(applyDuel(master(2016, 600), 2016, "loss").lpDelta).toBe(-30); // reference 2200: gap −40 → 60, bounded to −30
});

test("PROMO-2: a Master loss larger than the LP held floors at 0 LP and stays in Master", () => {
  expect(applyDuel(master(1918, 5), 1918, "loss")).toEqual({
    // 1918 − 16 = 1902; reference 1900 + ⌊5 × 50 / 100⌋ = 1902: gap 0 → −20; 5 − 20 floored at 0, 5 LP lost
    standing: { mmr: 1902, duelsPlayed: 21, rank: { tier: "master", lp: 0 } },
    mmrDelta: -16,
    lpDelta: -5,
    rankChange: "none",
  });
});

test("PROMO-3: a Master loss at 0 LP demotes to Diamond I at 75 LP", () => {
  expect(applyDuel(master(1916, 0), 1916, "loss")).toEqual({
    // 1916 − 16 = 1900; reference 1900: gap 0 → −20; at 0 LP → Diamond I at 75
    standing: { mmr: 1900, duelsPlayed: 21, rank: { tier: "diamond", division: 1, lp: 75 } },
    mmrDelta: -16,
    lpDelta: -20,
    rankChange: "demoted",
  });
});

test("LP-1: the Master threshold and the MMR per LP held come from the configuration given", () => {
  const config = { ...DEFAULT_RANKED_CONFIG, mmrPerDivision: 100, lpPerDivision: 50 };

  expect(applyDuel(master(3034, 75), 3034, "win", config)).toEqual({
    // 3034 + 16 = 3050; reference 900 + 20 × 100 + ⌊75 × 100 / 50⌋ = 3050: gap 0 → +20;
    // 75 + 20 = 95, past the 50 LP per Division with no promotion
    standing: { mmr: 3050, duelsPlayed: 21, rank: { tier: "master", lp: 95 } },
    mmrDelta: 16,
    lpDelta: 20,
    rankChange: "none",
  });
});

test("PURE-1: a Master standing and its update pass through JSON unchanged", () => {
  const standing = master(1959, 150);
  const update = applyDuel(standing, 1959, "win");

  expect(JSON.parse(JSON.stringify(standing))).toStrictEqual(standing);
  expect(JSON.parse(JSON.stringify(update))).toStrictEqual(update);
  expect(update).toStrictEqual({
    // 1959 + 16 = 1975; reference 1900 + ⌊150 × 50 / 100⌋ = 1975: gap 0 → +20; 150 + 20 = 170
    standing: { mmr: 1975, duelsPlayed: 21, rank: { tier: "master", lp: 170 } },
    mmrDelta: 16,
    lpDelta: 20,
    rankChange: "none",
  });
});
