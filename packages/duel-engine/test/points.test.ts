import { expect, test } from "bun:test";
import type { LiveStats } from "@repo/typing-engine";
import { getPoints, POINTS_FACTOR } from "../src/index.ts";

test("POINTS-1: Points are the WPM times the square of the Accuracy, times 10", () => {
  expect(POINTS_FACTOR).toBe(10);
  expect(getPoints({ wpm: 100, accuracy: 93 })).toBe(865);
  expect(getPoints({ wpm: 90, accuracy: 99 })).toBe(882);
  expect(getPoints({ wpm: 80, accuracy: 100 })).toBe(800);
});

test("POINTS-2: Points are rounded to the nearest integer", () => {
  // 1009.59, 865.59 and 864.64 before rounding.
  expect(getPoints({ wpm: 104.1, accuracy: 98.48 })).toBe(1010);
  expect(getPoints({ wpm: 100.08, accuracy: 93 })).toBe(866);
  expect(getPoints({ wpm: 99.97, accuracy: 93 })).toBe(865);
});

test("POINTS-3: nothing typed is worth 0 Points", () => {
  expect(getPoints({ wpm: 0, accuracy: 0 })).toBe(0);
  expect(getPoints({ wpm: 0, accuracy: 100 })).toBe(0);
});

test("POINTS-4: Live stats give Points like a Result", () => {
  const live: LiveStats = { wpm: 100, rawWpm: 110, accuracy: 93 };

  expect(getPoints(live)).toBe(865);
});
