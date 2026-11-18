import { expect, test } from "bun:test";
import { expectedScore } from "../src/index.ts";

test("MMR-1: two Players with the same MMR each expect half a win", () => {
  expect(expectedScore(1200, 1200)).toBe(0.5);
});

test("MMR-1: the Player with the higher MMR expects more than half a win, the other the rest", () => {
  // 400 MMR above: 1 / (1 + 10^(−400 / 400)) = 1 / 1.1 = 0.90909…
  expect(expectedScore(1600, 1200)).toBeCloseTo(0.909_090_9, 7);
  // 400 MMR below: 1 / (1 + 10^(400 / 400)) = 1 / 11 = 0.09090…
  expect(expectedScore(1200, 1600)).toBeCloseTo(0.090_909_1, 7);
  // 200 MMR below: 1 / (1 + 10^(200 / 400)) = 1 / (1 + √10) = 0.24025…
  expect(expectedScore(1200, 1400)).toBeCloseTo(0.240_253_1, 7);
});
