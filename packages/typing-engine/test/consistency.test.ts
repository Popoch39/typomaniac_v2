import { expect, test } from "bun:test";
import { applyEvent, createGame, getResult } from "../src/index.ts";
import { typeText } from "./helpers/typing.ts";

/** Consistency of a 2 s time Game with `first` keystrokes in its first second and `second` in the next. */
function consistencyOfTwoSeconds(first: number, second: number) {
  const text = "abcdefghijklmnopqrstuvwxyz";
  const game = createGame({ mode: "time", seconds: 2 }, [text]);
  const firstSecond = typeText(game, text.slice(0, first), 0, 100);
  const secondSecond = typeText(firstSecond, text.slice(first, first + second), 1100, 100);
  return getResult(applyEvent(secondSecond, { type: "tick", at: 2000 })).consistency;
}

test("CONS-1: a perfectly regular Game has a consistency of 100", () => {
  const game = createGame({ mode: "time", seconds: 3 }, ["abcd", "efgh", "ijkl"]);
  // 5 keystrokes in each of the 3 seconds: rates 60, 60, 60, deviation 0.
  const first = typeText(game, "abcd ", 0, 200);
  const second = typeText(first, "efgh ", 1200, 150);
  const third = typeText(second, "ijkl ", 2200, 150);

  const finished = applyEvent(third, { type: "tick", at: 3000 });

  expect(getResult(finished).consistency).toBe(100);
});

test("CONS-1: an irregular Game has a lower consistency", () => {
  // Rates 48 and 72: mean 60, population deviation 12, c = 0.2.
  // c + c³/3 + c⁵/5 = 0.202730…, tanh = 0.199998…: 100 × (1 − 0.199998) = 80.00.
  expect(consistencyOfTwoSeconds(4, 6)).toBe(80);
});

test("CONS-1: the consistency is rounded to 2 decimals", () => {
  // Rates 48 and 24: mean 36, deviation 12, c = 1 / 3.
  // c + c³/3 + c⁵/5 = 0.346502…, tanh = 0.333269…: 66.673… rounds to 66.67.
  expect(consistencyOfTwoSeconds(4, 2)).toBe(66.67);
});

test("CONS-1: the deviation is the population one, not the sample one", () => {
  // Rates 72 and 24: mean 48, population deviation 24 (the sample one would be 33.94), c = 0.5.
  // c + c³/3 + c⁵/5 = 0.547916…, tanh = 0.498957…: 50.10.
  expect(consistencyOfTwoSeconds(6, 2)).toBe(50.1);
});

test("CONS-2: a Game without any bucket has a consistency of 0", () => {
  const game = createGame({ mode: "words", wordCount: 1 }, ["ab"]);
  const finished = typeText(game, "ab", 0, 400);

  expect(getResult(finished).consistency).toBe(0);
});

test("CONS-2: a Game whose keystroke rate is 0 in every bucket has a consistency of 0", () => {
  const game = createGame({ mode: "time", seconds: 2 }, ["ab"]);
  const started = applyEvent(game, { type: "start", at: 10_000 });

  const finished = applyEvent(started, { type: "tick", at: 12_000 });

  expect(getResult(finished).consistency).toBe(0);
});
