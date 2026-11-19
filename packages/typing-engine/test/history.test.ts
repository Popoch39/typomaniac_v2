import { expect, test } from "bun:test";
import { applyEvent, createGame, getResult, getWpmHistory } from "../src/index.ts";
import { typeText } from "./helpers/typing.ts";

/** History of a 1-word words Game on `word`, typed one character at each of `instants` (ms). */
function historyOfWord(word: string, instants: readonly number[]) {
  const game = createGame({ mode: "words", wordCount: 1 }, [word]);
  const finished = Array.from(word).reduce(
    (current, char, index) =>
      applyEvent(current, { type: "insert", at: instants[index] ?? 0, text: char }),
    game,
  );
  return getResult(finished).history;
}

test("HIST-1: the history cuts the Game into one-second buckets on a regular grid from the start", () => {
  const game = createGame({ mode: "time", seconds: 3 }, ["abcd", "efgh", "ijkl"]);
  // The clock starts at 5000 ms. 5 keystrokes per second: 0 to 800, 1200 to 1800, 2200 to 2800 ms.
  const first = typeText(game, "abcd ", 5000, 200);
  const second = typeText(first, "efgh ", 6200, 150);
  const third = typeText(second, "ijkl ", 7200, 150);

  const finished = applyEvent(third, { type: "tick", at: 8000 });

  // 5 keystrokes in a second: 5 / 5 / (1 / 60) = 60.
  expect(getResult(finished).history.keystrokeRate).toEqual([60, 60, 60]);
});

test("HIST-2: a keystroke on a bucket boundary belongs to the earlier bucket, and one after the last boundary to none", () => {
  const game = createGame({ mode: "time", seconds: 2 }, ["abcdefgh"]);
  // "a", "b", "c" at 0, 500 and 1000 ms, "d" at 1001 ms, "e" at 2002 ms, after the last boundary.
  const typing = typeText(typeText(typeText(game, "abc", 0, 500), "d", 1001, 0), "e", 2002, 0);

  const result = getResult(applyEvent(typing, { type: "tick", at: 2004 }));

  // 3 keystrokes up to 1000 ms included: 36. 1 keystroke up to 2000 ms: 12.
  expect(result.history.keystrokeRate).toEqual([36, 12]);
  expect(result.charCounts.correct).toBe(5);
});

test("HIST-3: a words Game gets one more bucket when the rest of its duration reaches half a second", () => {
  // 2.5 s: buckets ending at 1000, 2000 and 2500 ms. The last one holds 1 keystroke in 0.5 s:
  // 1 / 5 / (0.5 / 60) = 24.
  expect(historyOfWord("ab", [0, 2500]).keystrokeRate).toEqual([12, 0, 24]);
});

test("HIST-3: a words Game gets no extra bucket when the rest of its duration is below half a second", () => {
  // 2.49 s: the last keystroke is after the last boundary, in no bucket.
  expect(historyOfWord("ab", [0, 2490]).keystrokeRate).toEqual([12, 0]);
});

test("HIST-3: the rest is measured on the duration rounded to 2 decimals", () => {
  // 3.994 s rounds to 3.99: a last bucket of 0.994 s, 1 / 5 / (0.994 / 60) = 12.07…
  expect(historyOfWord("ab", [0, 3994]).keystrokeRate).toEqual([12, 0, 0, 12]);
  // 3.996 s rounds to 4.00: no rest, and only 3 whole seconds have elapsed.
  expect(historyOfWord("ab", [0, 3996]).keystrokeRate).toEqual([12, 0, 0]);
});

test("HIST-3: a words Game shorter than half a second has no bucket", () => {
  expect(historyOfWord("ab", [0, 400])).toEqual({ wpm: [], keystrokeRate: [], errors: [] });
});

test("HIST-3: a words Game between half a second and a second has a single bucket, as long as the Game", () => {
  // 2 keystrokes in 0.7 s: 2 / 5 / (0.7 / 60) = 34.28…
  expect(historyOfWord("ab", [0, 700])).toEqual({ wpm: [34], keystrokeRate: [34], errors: [0] });
});

test("HIST-4: a time Game never gets an extra bucket", () => {
  const game = createGame({ mode: "time", seconds: 2 }, ["abcdefgh"]);
  const typing = typeText(typeText(game, "abc", 0, 500), "d", 2300, 0);

  const result = getResult(applyEvent(typing, { type: "tick", at: 2600 }));

  expect(result.history.keystrokeRate).toEqual([36, 0]);
});

test("HIST-5: the keystroke rate of the last bucket of a words Game is scaled to its real length", () => {
  // Buckets ending at 1000 and 1700 ms. 3 keystrokes in 0.7 s: 3 / 5 / (0.7 / 60) = 51.42…
  expect(historyOfWord("abcd", [0, 1300, 1500, 1700]).keystrokeRate).toEqual([12, 51]);
});

test("HIST-5: the keystroke rate counts incorrect keystrokes, but neither deletions nor refused insertions", () => {
  const game = createGame({ mode: "time", seconds: 2 }, ["cat", "dog"]);
  // "c", then "x" deleted at 200 ms, "at ", a space refused on the empty second word, then "d".
  const mistyped = typeText(game, "cx", 0, 100);
  const corrected = applyEvent(mistyped, { type: "delete", at: 200, unit: "char" });
  const validated = typeText(corrected, "at  ", 300, 100);
  const typing = typeText(validated, "d", 1100, 0);

  const result = getResult(applyEvent(typing, { type: "tick", at: 2000 }));

  // First second: "c", "x", "a", "t" and one space, 5 keystrokes. Second one: "d".
  expect(result.history.keystrokeRate).toEqual([60, 12]);
});

test("HIST-6: the error history counts the incorrect keystrokes of each bucket, even once deleted", () => {
  const game = createGame({ mode: "time", seconds: 2 }, ["cat", "dog"]);
  // "x" at 100 ms is deleted at 200 ms. In the second bucket, "x" at 1100 ms and "y" at 1200 ms.
  const mistyped = typeText(game, "cx", 0, 100);
  const corrected = applyEvent(mistyped, { type: "delete", at: 200, unit: "char" });
  const typing = typeText(typeText(corrected, "at ", 300, 100), "xy", 1100, 100);

  const result = getResult(applyEvent(typing, { type: "tick", at: 2000 }));

  expect(result.history.errors).toEqual([1, 2]);
});

test("HIST-7: the WPM history of a words Game is cumulative and credits the correct start of the active word", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);
  // "cat do" at 0, 200, …, 1000 ms, then "g" at 1500 ms: buckets ending at 1000 and 1500 ms.
  const finished = typeText(typeText(game, "cat do", 0, 200), "g", 1500, 0);

  // At 1000 ms: "cat " (4) and "do", the correct start of "dog" (2): 6 / 5 / (1 / 60) = 72.
  // At 1500 ms: 7 / 5 / (1.5 / 60) = 56.
  expect(getResult(finished).history).toEqual({
    wpm: [72, 56],
    keystrokeRate: [72, 24],
    errors: [0, 0],
  });
});

test("HIST-7: the WPM history follows the input as it was at the end of each bucket", () => {
  const game = createGame({ mode: "time", seconds: 2 }, ["cat", "dog", "sun"]);
  // "cat d" in the first second, then "x" at 1200 ms: "dx" is no longer a correct start.
  const mistyped = typeText(typeText(game, "cat d", 0, 200), "x", 1200, 0);
  const corrected = applyEvent(mistyped, { type: "delete", at: 1500, unit: "char" });

  // At 1000 ms: 5 / 5 / (1 / 60) = 60. At 2000 ms: only "cat ", 4 / 5 / (2 / 60) = 24.
  expect(getResult(applyEvent(mistyped, { type: "tick", at: 2000 })).history.wpm).toEqual([60, 24]);
  // Once "x" is deleted, "d" is credited again: 5 / 5 / (2 / 60) = 30.
  expect(getResult(applyEvent(corrected, { type: "tick", at: 2000 })).history.wpm).toEqual([
    60, 30,
  ]);
});

test("HIST-7: what is typed after the last boundary is not in the WPM history", () => {
  const game = createGame({ mode: "time", seconds: 2 }, ["abcdefgh"]);
  const typing = typeText(typeText(typeText(game, "abc", 0, 500), "d", 1001, 0), "e", 2002, 0);

  const result = getResult(applyEvent(typing, { type: "tick", at: 2004 }));

  // "abc" at 1000 ms: 36. "abcd" at 2000 ms: 4 / 5 / (2 / 60) = 24, without the "e" typed at 2002 ms.
  expect(result.history.wpm).toEqual([36, 24]);
});

test("HIST-1: after a start signal the buckets are counted from the signal, empty leading ones included", () => {
  const game = createGame({ mode: "words", wordCount: 1 }, ["ab"]);
  const started = applyEvent(game, { type: "start", at: 10_000 });
  // "a" 2.2 s after the signal, "b" 3.5 s after it: buckets ending 1, 2, 3 and 3.5 s after it.
  const finished = typeText(started, "ab", 12_200, 1300);

  const result = getResult(finished);

  expect(result.history).toEqual({
    // 1 / 5 / (3 / 60) = 4, then 2 / 5 / (3.5 / 60) = 6.85…
    wpm: [0, 0, 4, 7],
    // The last bucket lasts 0.5 s: 1 / 5 / (0.5 / 60) = 24.
    keystrokeRate: [0, 0, 12, 24],
    errors: [0, 0, 0, 0],
  });
  // Mean 9, deviation √99 = 9.9499, c = 1.10554, 100 × (1 − tanh(1.88625…)) = 4.50.
  expect(result.consistency).toBe(4.5);
});

/** A 30 s time Game on 4-letter words, its clock started at 0 ms. */
function startedTimeGame(seconds = 30) {
  const words = ["abcd", "efgh", "ijkl", "mnop", "qrst", "uvwx"];
  return applyEvent(createGame({ mode: "time", seconds }, words), { type: "start", at: 0 });
}

test("HIST-8: the WPM history read live has one 0 per second elapsed while nothing is typed", () => {
  expect(getWpmHistory(startedTimeGame(), 3500)).toEqual([0, 0, 0]);
});

test("HIST-8: a steady typist reads the same WPM every second", () => {
  // 10 characters a second, from 100 to 3000 ms: 10 / 5 / (1 / 60) = 120.
  const typing = typeText(startedTimeGame(), "abcd efgh ijkl mnop qrst uvwx ", 100, 100);

  expect(getWpmHistory(typing, 3000)).toEqual([120, 120, 120]);
});

test("HIST-8: a pause makes the WPM history fall, the WPM being counted since the start", () => {
  // 5 characters by 500 ms, then nothing: 5 / 5 / (1 / 60) = 60, then 30 and 20.
  const typing = typeText(startedTimeGame(), "abcd ", 100, 100);

  expect(getWpmHistory(typing, 3000)).toEqual([60, 30, 20]);
});

test("HIST-8: the WPM history read before the start is empty", () => {
  const game = createGame({ mode: "time", seconds: 30 }, ["abcd"]);

  expect(getWpmHistory(game, 5000)).toEqual([]);
  expect(getWpmHistory(applyEvent(game, { type: "start", at: 5000 }), 4000)).toEqual([]);
});

test("HIST-8: the WPM history read mid-second stops on the last whole second", () => {
  // "efgh " typed between 1100 and 1500 ms is in no whole second yet at 1999 ms.
  const typing = typeText(typeText(startedTimeGame(), "abcd ", 100, 100), "efgh ", 1100, 100);

  expect(getWpmHistory(typing, 1999)).toEqual([60]);
});

test("HIST-8: at the end of a time Game, the WPM history read live is the Result's", () => {
  const typing = typeText(startedTimeGame(3), "abcd efgh ijkl ", 200, 150);
  // The end Tick lands a little after the third second, as a real clock does.
  const finished = applyEvent(typing, { type: "tick", at: 3004 });

  expect(getWpmHistory(finished, 3004)).toEqual(getResult(finished).history.wpm);
  // A finished Game no longer moves, however late it is read.
  expect(getWpmHistory(finished, 9000)).toEqual(getResult(finished).history.wpm);
});
