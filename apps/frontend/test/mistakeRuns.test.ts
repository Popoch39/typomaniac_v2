import { expect, test } from "bun:test";
import { mistakeRuns } from "../src/features/game/words/mistakeRuns.ts";

test("a word typed right has no mistake", () => {
  expect(mistakeRuns("case", "case")).toEqual([]);
});

test("missed letters that follow each other make one run", () => {
  expect(mistakeRuns("case", "ca")).toEqual([{ start: 2, letters: 2 }]);
});

test("mistakes split by a correct letter make separate runs", () => {
  expect(mistakeRuns("case", "xaxe")).toEqual([
    { start: 0, letters: 1 },
    { start: 2, letters: 1 },
  ]);
});

test("extra letters join the run of the mistakes before them", () => {
  expect(mistakeRuns("the", "thxes")).toEqual([{ start: 2, letters: 3 }]);
});
