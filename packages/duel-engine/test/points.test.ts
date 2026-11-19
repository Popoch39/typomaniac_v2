import { expect, test } from "bun:test";
import type { LiveStats } from "@repo/typing-engine";
import { getPoints, POINTS_FACTOR } from "../src/index.ts";

test("POINTS-1: Points are the WPM times the square of the Accuracy, times 10", () => {
  expect(POINTS_FACTOR).toBe(10);
  expect(getPoints({ wpm: 100, accuracy: 93, multiplier: 1 })).toBe(865);
  expect(getPoints({ wpm: 90, accuracy: 99, multiplier: 1 })).toBe(882);
  expect(getPoints({ wpm: 80, accuracy: 100, multiplier: 1 })).toBe(800);
});

test("POINTS-2: Points are rounded to the nearest integer", () => {
  // 1009.59, 865.59 and 864.64 before rounding.
  expect(getPoints({ wpm: 104.1, accuracy: 98.48, multiplier: 1 })).toBe(1010);
  expect(getPoints({ wpm: 100.08, accuracy: 93, multiplier: 1 })).toBe(866);
  expect(getPoints({ wpm: 99.97, accuracy: 93, multiplier: 1 })).toBe(865);
});

test("POINTS-3: nothing typed is worth 0 Points", () => {
  expect(getPoints({ wpm: 0, accuracy: 0, multiplier: 1 })).toBe(0);
  expect(getPoints({ wpm: 0, accuracy: 100, multiplier: 1 })).toBe(0);
});

test("POINTS-4: Live stats give Points like a Result", () => {
  const live: LiveStats = { wpm: 100, rawWpm: 110, accuracy: 93 };

  expect(getPoints({ ...live, multiplier: 1 })).toBe(865);
});

test("POINTS-5: Points are multiplied by the average Multiplier, and rounded once, at the end", () => {
  expect(getPoints({ wpm: 80, accuracy: 100, multiplier: 1.1 })).toBe(880);
  // 853.72 rounded once, against 805 × 1.06 = 853.3 had the Points been rounded before multiplying.
  expect(getPoints({ wpm: 80.54, accuracy: 100, multiplier: 1.06 })).toBe(854);
});

test("POINTS-6: a perfect 90 WPM Game beats 100 WPM at 95 % Accuracy, a perfect 70 WPM Game does not", () => {
  // Perfect Games of 45 and 35 five-character words: 1, 1.02, 1.04, 1.06, 1.08, then 1.10 each.
  const perfect90 = { wpm: 90, accuracy: 100, multiplier: (5.2 + 40 * 1.1) / 45 };
  const perfect70 = { wpm: 70, accuracy: 100, multiplier: (5.2 + 30 * 1.1) / 35 };
  const fastButFlawed = { wpm: 100, accuracy: 95, multiplier: 1 };

  expect(getPoints(perfect90)).toBe(984);
  expect(getPoints(fastButFlawed)).toBe(903);
  expect(getPoints(perfect70)).toBe(764);
});
