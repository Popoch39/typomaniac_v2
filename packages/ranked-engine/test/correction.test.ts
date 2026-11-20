import { expect, test } from "bun:test";
import { applyCorrection } from "../src/index.ts";
import { ranked } from "./helpers/standing.ts";

test("CORRECT-1: a correction moves the MMR and the LP by its signed amounts and leaves the Duels played", () => {
  expect(
    applyCorrection(ranked(1300, { tier: "gold", division: 3, lp: 40 }), { mmr: -16, lp: -22 }),
  ).toEqual(ranked(1284, { tier: "gold", division: 3, lp: 18 }));
});

test("CORRECT-2: a loss of LP below 0 goes down into the Division below, with no demotion landing", () => {
  expect(
    applyCorrection(ranked(1300, { tier: "gold", division: 3, lp: 10 }), { mmr: -16, lp: -30 }),
  ).toEqual(ranked(1284, { tier: "gold", division: 4, lp: 80 }));
});

test("CORRECT-3: a correction stops at Bronze IV with 0 LP, and at an MMR of 0", () => {
  expect(
    applyCorrection(ranked(10, { tier: "bronze", division: 3, lp: 5 }), { mmr: -30, lp: -150 }),
  ).toEqual(ranked(0, { tier: "bronze", division: 4, lp: 0 }));
});

test("CORRECT-2: LP given back above 100 go up into the next Division, from Division I into the next Tier", () => {
  expect(
    applyCorrection(ranked(1250, { tier: "silver", division: 1, lp: 90 }), { mmr: 16, lp: 135 }),
  ).toEqual(ranked(1266, { tier: "gold", division: 3, lp: 25 }));
});

test("CORRECT-2: LP given back past Diamond I reach Master, where they grow without limit", () => {
  expect(
    applyCorrection(ranked(1850, { tier: "diamond", division: 1, lp: 90 }), { mmr: 16, lp: 230 }),
  ).toEqual(ranked(1866, { tier: "master", lp: 220 }));
});

test("CORRECT-2: LP taken back below 0 in Master leave it for Diamond I", () => {
  expect(applyCorrection(ranked(1950, { tier: "master", lp: 10 }), { mmr: -16, lp: -30 })).toEqual(
    ranked(1934, { tier: "diamond", division: 1, lp: 80 }),
  );
});

test("CORRECT-4: an Unranked Player has their MMR corrected and stays without a Rank", () => {
  expect(applyCorrection({ mmr: 1264, duelsPlayed: 3, rank: null }, { mmr: -32, lp: -20 })).toEqual(
    { mmr: 1232, duelsPlayed: 3, rank: null },
  );
});
