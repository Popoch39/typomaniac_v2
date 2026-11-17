import { expect, test } from "bun:test";
import { applyEvent, createGame, getLiveStats } from "../src/index.ts";
import { typeText } from "./helpers/typing.ts";

test("LIVE-1: the live WPM counts the exact words and the correct start of the active word, over the elapsed time", () => {
  const game = createGame({ mode: "time", seconds: 15 }, ["cat", "dog", "sun"]);
  // "cax " is wrong, "d" is the correct start of "dog".
  const typing = typeText(game, "cax d", 0, 200);

  // 1 character in 1 s: 1 / 5 / (1 / 60) = 12.
  expect(getLiveStats(typing, 1000).wpm).toBe(12);
});

test("LIVE-1: the live WPM credits the active word in a words Game too", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);
  const typing = typeText(game, "cat d", 0, 200);

  // "cat " (4) and "d" (1): 5 / 5 / (1 / 60) = 60.
  expect(getLiveStats(typing, 1000).wpm).toBe(60);
});

test("LIVE-2: the live raw WPM counts the correct, incorrect and extra characters", () => {
  const game = createGame({ mode: "time", seconds: 15 }, ["cat", "dog", "sun"]);
  // "cax ": 2 correct, 2 incorrect. "dogx": 3 correct, 1 extra on the separator position.
  const typing = typeText(game, "cax dogx", 0, 100);

  // 8 characters in 1 s: 8 / 5 / (1 / 60) = 96.
  expect(getLiveStats(typing, 1000).rawWpm).toBe(96);
});

test("LIVE-3: the live WPM and raw WPM are rounded to the integer", () => {
  const game = createGame({ mode: "time", seconds: 15 }, ["cat", "dog", "sun"]);
  const typing = typeText(game, "cax d", 0, 100);

  // WPM: 1 / 5 / (0.7 / 60) = 17.14… Raw: 5 / 5 / (0.7 / 60) = 85.71…
  expect(getLiveStats(typing, 700)).toEqual({ wpm: 17, rawWpm: 86, accuracy: 80 });
});

test("LIVE-4: the live accuracy is the share of correct keystrokes, floored to the integer", () => {
  const game = createGame({ mode: "time", seconds: 15 }, ["cat", "dog", "sun"]);
  // 11 keystrokes, 9 correct: the two "x" are incorrect. 81.81… is floored, not rounded to 82.
  const typing = typeText(game, "cax dox sun", 0, 100);

  expect(getLiveStats(typing, 2000).accuracy).toBe(81);
});

test("LIVE-5: the live stats of a Game that has not started are all 0", () => {
  const game = createGame({ mode: "time", seconds: 15 }, ["cat", "dog"]);

  expect(getLiveStats(game, 5000)).toEqual({ wpm: 0, rawWpm: 0, accuracy: 0 });
});

test("LIVE-5: at the instant of the first keystroke no time has elapsed and the speeds are 0", () => {
  const game = createGame({ mode: "time", seconds: 15 }, ["cat", "dog"]);
  const typing = typeText(game, "c", 3000, 0);

  expect(getLiveStats(typing, 3000)).toEqual({ wpm: 0, rawWpm: 0, accuracy: 100 });
});

test("LIVE-5: a Game started on a signal has live stats of 0 until its first keystroke", () => {
  const game = createGame({ mode: "time", seconds: 15 }, ["cat", "dog"]);
  const started = applyEvent(game, { type: "start", at: 10_000 });

  expect(getLiveStats(started, 11_000)).toEqual({ wpm: 0, rawWpm: 0, accuracy: 0 });
});

test("LIVE-6: the elapsed time of the live stats is counted from the start signal", () => {
  const game = createGame({ mode: "time", seconds: 15 }, ["cat", "dog"]);
  const started = applyEvent(game, { type: "start", at: 10_000 });
  // First letter 1 s after the signal.
  const typing = typeText(started, "cat d", 11_000, 100);

  // 5 characters, 2 s after the signal: 5 / 5 / (2 / 60) = 30.
  expect(getLiveStats(typing, 12_000)).toEqual({ wpm: 30, rawWpm: 30, accuracy: 100 });
});

test("LIVE-6: the live stats of a finished Game stay those of its end", () => {
  const game = createGame({ mode: "words", wordCount: 1 }, ["ab"]);
  const finished = typeText(game, "ab", 0, 1000);

  // 2 characters in 1 s, whatever the instant asked: 2 / 5 / (1 / 60) = 24.
  expect(getLiveStats(finished, 9000)).toEqual({ wpm: 24, rawWpm: 24, accuracy: 100 });
});
