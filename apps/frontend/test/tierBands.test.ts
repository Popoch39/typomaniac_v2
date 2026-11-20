import { expect, test } from "bun:test";
import { ladderDomain, tierBands } from "../src/features/progress/rank/tierBands.ts";

test("the ladder shown runs from the bottom of the lowest Division reached to the top of the highest", () => {
  // Silver II at 30 LP, then Gold IV at 80 LP.
  expect(ladderDomain([630, 880])).toEqual([600, 900]);
});

test("a Rank at 0 LP shows its own Division above it", () => {
  expect(ladderDomain([800])).toEqual([800, 900]);
});

test("Master shows up to the next hundred of LP above the highest reached", () => {
  expect(ladderDomain([1950, 2340])).toEqual([1900, 2400]);
});

test("a band within one Tier is that Tier alone", () => {
  expect(tierBands([600, 700])).toEqual([{ tier: "silver", from: 600, to: 700 }]);
});

test("the bands split the ladder shown where each Tier starts", () => {
  expect(tierBands([700, 1300])).toEqual([
    { tier: "silver", from: 700, to: 800 },
    { tier: "gold", from: 800, to: 1200 },
    { tier: "platinum", from: 1200, to: 1300 },
  ]);
});

test("Master's band runs from Diamond I's top to the top of the ladder shown", () => {
  expect(tierBands([1900, 2400])).toEqual([
    { tier: "diamond", from: 1900, to: 2000 },
    { tier: "master", from: 2000, to: 2400 },
  ]);
});
