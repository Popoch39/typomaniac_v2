import { expect, test } from "bun:test";
import type { Result } from "@repo/typing-engine";
import { getOutcome } from "../src/index.ts";

function result(wpm: number, accuracy: number): Result {
  return {
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
}

test("OUTCOME-1: the higher WPM wins, whatever the Accuracy", () => {
  expect(getOutcome(result(80.5, 90), result(80.49, 100))).toBe("win");
  expect(getOutcome(result(80.49, 100), result(80.5, 90))).toBe("loss");
});

test("OUTCOME-2: at equal WPM, the higher Accuracy wins", () => {
  expect(getOutcome(result(80, 97.5), result(80, 97.49))).toBe("win");
  expect(getOutcome(result(80, 97.49), result(80, 97.5))).toBe("loss");
});

test("OUTCOME-3: at equal WPM and equal Accuracy, the Duel is a draw", () => {
  expect(getOutcome(result(80, 97.5), result(80, 97.5))).toBe("draw");
  expect(getOutcome(result(0, 0), result(0, 0))).toBe("draw");
});

test("OUTCOME-4: the two Outcomes of a Duel are always win and loss, or draw and draw", () => {
  const results = [result(60, 90), result(60, 95), result(70, 90), result(70, 95)];
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
    ["loss", "win"],
    ["loss", "win"],
    ["win", "loss"],
    ["win", "loss"],
    ["draw", "draw"],
    ["loss", "win"],
    ["win", "loss"],
    ["win", "loss"],
    ["win", "loss"],
    ["draw", "draw"],
  ]);
});
