import { expect, test } from "bun:test";
import { ladderIndex, rankAtLadderIndex, type Rank } from "../src/index.ts";

test("LADDER-1: a Division's index counts the Divisions below it, from Bronze IV at 0 to Diamond I at 19", () => {
  expect(ladderIndex({ tier: "bronze", division: 4, lp: 0 })).toBe(0);
  expect(ladderIndex({ tier: "bronze", division: 1, lp: 40 })).toBe(3);
  expect(ladderIndex({ tier: "silver", division: 2, lp: 99 })).toBe(6);
  expect(ladderIndex({ tier: "diamond", division: 1, lp: 0 })).toBe(19);
});

test("LADDER-1: Master sits one step above Diamond I, at 20, whatever the LP held", () => {
  expect(ladderIndex({ tier: "master", lp: 0 })).toBe(20);
  expect(ladderIndex({ tier: "master", lp: 340 })).toBe(20);
});

test("LADDER-1: the index orders the Divisions as the ladder does", () => {
  const climbing: Rank[] = [
    { tier: "bronze", division: 4, lp: 90 },
    { tier: "bronze", division: 3, lp: 0 },
    { tier: "gold", division: 1, lp: 10 },
    { tier: "platinum", division: 4, lp: 0 },
    { tier: "master", lp: 0 },
  ];
  expect(climbing.map(ladderIndex)).toEqual([0, 1, 11, 12, 20]);
});

test("LADDER-2: an index and the LP held give back the Rank", () => {
  expect(rankAtLadderIndex(0, 0)).toEqual({ tier: "bronze", division: 4, lp: 0 });
  expect(rankAtLadderIndex(6, 45)).toEqual({ tier: "silver", division: 2, lp: 45 });
  expect(rankAtLadderIndex(19, 99)).toEqual({ tier: "diamond", division: 1, lp: 99 });
});

test("LADDER-2: index 20 gives back Master, without a Division", () => {
  expect(rankAtLadderIndex(20, 340)).toEqual({ tier: "master", lp: 340 });
});

test("LADDER-2: an index off the ladder is refused", () => {
  expect(() => rankAtLadderIndex(21, 0)).toThrow(RangeError);
  expect(() => rankAtLadderIndex(-1, 0)).toThrow(RangeError);
  expect(() => rankAtLadderIndex(1.5, 0)).toThrow(RangeError);
});
