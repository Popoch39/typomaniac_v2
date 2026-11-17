import { expect, test } from "bun:test";
import { applyEvent, createGame, getResult } from "../src/index.ts";
import { typeText } from "./helpers/typing.ts";

test("RES-1: the duration is the gap between the start and the end, in seconds", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["ab", "cd"]);
  // Insertions at 1000, 4000, 7000, 10000 and 13000 ms.
  const finished = typeText(game, "ab cd", 1000, 3000);

  expect(getResult(finished).duration).toBe(12);
});

test("RES-1: the duration is rounded to 2 decimals", () => {
  const game = createGame({ mode: "words", wordCount: 1 }, ["abc"]);
  // Insertions at 0, 617.25 and 1234.5 ms: 1.2345 s.
  const finished = typeText(game, "abc", 0, 617.25);

  expect(getResult(finished).duration).toBe(1.23);
});

test("RES-2: the WPM is the characters of the exact words, separators included, divided by 5 then by the minutes", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["ab", "cd"]);
  const finished = typeText(game, "ab cd", 1000, 3000);

  // 5 characters in 12 s: 1 word in 0.2 min.
  expect(getResult(finished).wpm).toBe(5);
});

test("RES-2: the WPM is rounded to 2 decimals", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["ab", "cd"]);
  // Insertions at 0, 1750, 3500, 5250 and 7000 ms: 5 characters in 7 s, 60 / 7 = 8.571…
  const finished = typeText(game, "ab cd", 0, 1750);

  expect(getResult(finished).wpm).toBe(8.57);
});

test("RES-2: the WPM is computed from the rounded duration", () => {
  const game = createGame({ mode: "words", wordCount: 1 }, ["abc"]);
  const finished = typeText(game, "abc", 0, 617.25);

  // 3 characters in 1.23 s: 36 / 1.23 = 29.268… (the unrounded 1.2345 s would give 29.16).
  expect(getResult(finished).wpm).toBe(29.27);
});

test("RES-3: the raw WPM equals the WPM for a Game without mistake", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["ab", "cd"]);
  const finished = typeText(game, "ab cd", 0, 1750);

  expect(getResult(finished).rawWpm).toBe(8.57);
});

test("RES-4: the WPM and the raw WPM are 0 when the duration is zero", () => {
  const game = createGame({ mode: "words", wordCount: 1 }, ["ab"]);
  const finished = applyEvent(game, { type: "insert", at: 250, text: "ab" });

  expect(getResult(finished)).toEqual({ duration: 0, wpm: 0, rawWpm: 0 });
});

test("RES-5: asking for the Result of a Game that has not started is refused", () => {
  const game = createGame({ mode: "words", wordCount: 1 }, ["ab"]);

  expect(() => getResult(game)).toThrow("not finished");
});

test("RES-5: asking for the Result of a running Game is refused", () => {
  const game = createGame({ mode: "words", wordCount: 1 }, ["ab"]);
  const running = applyEvent(game, { type: "insert", at: 0, text: "a" });

  expect(() => getResult(running)).toThrow("not finished");
});
