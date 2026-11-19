import { expect, test } from "bun:test";
import type { Result } from "@repo/typing-engine";
import { getOutcome } from "../src/index.ts";

function result(wpm: number, accuracy: number, multiplier = 1) {
  const measured: Result = {
    duration: 30,
    wpm,
    rawWpm: wpm,
    accuracy,
    charCounts: { correct: 0, incorrect: 0, extra: 0, missed: 0, exactWords: 0 },
    consistency: 0,
    history: { wpm: [], keystrokeRate: [], errors: [] },
    keyPressGaps: [],
    keyHoldDurations: [],
    keyConsistency: 0,
    inactiveSeconds: 0,
    inactiveAtEnd: false,
  };
  return { ...measured, multiplier };
}

test("OUTCOME-1: at equal Accuracy, the Participant with the higher WPM has more Points and wins the Round", () => {
  expect(getOutcome(result(81, 95), result(80, 95))).toBe("win");
  expect(getOutcome(result(80, 95), result(81, 95))).toBe("loss");
});

test("OUTCOME-2: a slower Participant with enough extra Accuracy has more Points and wins the Round", () => {
  // 882 Points against 865.
  expect(getOutcome(result(90, 99), result(100, 93))).toBe("win");
  expect(getOutcome(result(100, 93), result(90, 99))).toBe("loss");
});

test("OUTCOME-3: at equal Points, the Round is a draw, with no tie-break on WPM or Accuracy", () => {
  // 810 Points each.
  expect(getOutcome(result(100, 90), result(81, 100))).toBe("draw");
  // 652 Points each once rounded.
  expect(getOutcome(result(80.5, 90), result(80.49, 90))).toBe("draw");
  expect(getOutcome(result(0, 0), result(0, 0))).toBe("draw");
});

test("OUTCOME-4: the two Outcomes of a Round are always win and loss, or draw and draw", () => {
  // 486, 600, 567 and 700 Points.
  const results = [result(60, 90), result(60, 100), result(70, 90), result(70, 100)];
  const pairs = results.flatMap((first) => results.map((second) => [first, second] as const));

  const outcomes = pairs.map(([first, second]) => [
    getOutcome(first, second),
    getOutcome(second, first),
  ]);

  expect(outcomes).toEqual([
    ["draw", "draw"],
    ["loss", "win"],
    ["loss", "win"],
    ["loss", "win"],
    ["win", "loss"],
    ["draw", "draw"],
    ["win", "loss"],
    ["loss", "win"],
    ["win", "loss"],
    ["loss", "win"],
    ["draw", "draw"],
    ["loss", "win"],
    ["win", "loss"],
    ["win", "loss"],
    ["win", "loss"],
    ["draw", "draw"],
  ]);
});

test("OUTCOME-5: the Multiplier can turn the Round: a perfect 90 WPM Game beats 100 WPM at 95 % only with it", () => {
  // 900 Points against 903 without the Multiplier, 984 against 903 with it.
  expect(getOutcome(result(90, 100), result(100, 95))).toBe("loss");
  expect(getOutcome(result(90, 100, (5.2 + 40 * 1.1) / 45), result(100, 95))).toBe("win");
  expect(getOutcome(result(100, 95), result(90, 100, (5.2 + 40 * 1.1) / 45))).toBe("loss");
});

test("OUTCOME-6: equal Points with their Multipliers are still a draw, with no tie-break on the Multiplier", () => {
  // 968 Points each.
  expect(getOutcome(result(88, 100, 1.1), result(96.8, 100))).toBe("draw");
});
