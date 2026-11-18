import { expect, test } from "bun:test";
import { judgeLetter } from "../src/features/game/words/judgeLetter.ts";

test("a letter not typed yet is untyped", () => {
  expect(judgeLetter("the", "t", 1)).toBe("untyped");
});

test("a typed letter matching the word is correct", () => {
  expect(judgeLetter("the", "th", 1)).toBe("correct");
});

test("a typed letter differing from the word is incorrect", () => {
  expect(judgeLetter("the", "tx", 1)).toBe("incorrect");
});

test("a letter typed past the end of the word is extra", () => {
  expect(judgeLetter("the", "thes", 3)).toBe("extra");
});
