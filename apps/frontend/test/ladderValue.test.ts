import { expect, test } from "bun:test";
import { ladderValue } from "../src/features/progress/rank/ladderValue.ts";

test("Bronze IV at 0 LP is the bottom of the ladder", () => {
  expect(ladderValue({ ladderIndex: 0, lp: 0 })).toBe(0);
});

test("each Division below a Rank adds 100, then its LP are added", () => {
  // Gold II: two Tiers of four Divisions, then Gold IV and Gold III, below it.
  expect(ladderValue({ ladderIndex: 10, lp: 45 })).toBe(1045);
});

test("a Promotion moves the value on from the top of the Division left", () => {
  expect(ladderValue({ ladderIndex: 6, lp: 99 })).toBeLessThan(
    ladderValue({ ladderIndex: 7, lp: 0 }),
  );
});

test("Master starts one Division above Diamond I and climbs with its LP past 100", () => {
  expect(ladderValue({ ladderIndex: 20, lp: 0 })).toBe(2000);
  expect(ladderValue({ ladderIndex: 20, lp: 340 })).toBe(2340);
});
