import { expect, test } from "bun:test";
import { applyEvent, createGame, getResult } from "../src/index.ts";
import { typeText } from "./helpers/typing.ts";

/** Character counts of a 2 s time Game on "cat dog sun" where `typed` is typed before the ending Tick. */
function countsAfterTyping(typed: string, words: readonly string[] = ["cat", "dog", "sun"]) {
  const game = createGame({ mode: "time", seconds: 2 }, words);
  const finished = applyEvent(typeText(game, typed, 0, 100), { type: "tick", at: 2000 });
  return getResult(finished).charCounts;
}

test("RES-1: the duration of a time Game is the gap between the start and the ending Tick, not the limit", () => {
  const game = createGame({ mode: "time", seconds: 2 }, ["cat", "dog"]);
  const typing = typeText(game, "cat", 1000, 100);

  // 2.004 s rounds to 2, 2.006 s rounds to 2.01.
  expect(getResult(applyEvent(typing, { type: "tick", at: 3004 })).duration).toBe(2);
  expect(getResult(applyEvent(typing, { type: "tick", at: 3006 })).duration).toBe(2.01);
});

test("END-5: a time Game played to its ending Tick gives a complete Result, late keystroke included", () => {
  const game = createGame({ mode: "time", seconds: 2 }, ["cat", "dog", "sun"]);
  // Insertions at 0, 300, …, 1500 ms, a Tick below the limit, then "g" after the limit.
  const typing = applyEvent(typeText(game, "cat do", 0, 300), { type: "tick", at: 1000 });
  const late = applyEvent(typing, { type: "insert", at: 2003, text: "g" });

  const finished = applyEvent(late, { type: "tick", at: 2006 });

  // "cat " is exact (4), "dog" is the correct start of the active word (3).
  // 7 characters in 2.01 s: 7 / 5 / (2.01 / 60) = 41.791…
  expect(getResult(finished)).toEqual({
    duration: 2.01,
    wpm: 41.79,
    rawWpm: 41.79,
    accuracy: 100,
    charCounts: { correct: 7, incorrect: 0, extra: 0, missed: 0, exactWords: 7 },
  });
});

test("CHARS-6: the correct start of the active word is credited in the WPM and its untyped characters are not missed", () => {
  const game = createGame({ mode: "time", seconds: 2 }, ["cat", "dog", "sun"]);
  const finished = applyEvent(typeText(game, "cat d", 0, 100), { type: "tick", at: 2000 });

  const result = getResult(finished);

  // "cat " is exact (4), "d" starts "dog " (1): "og" and the separator are not missed.
  expect(result.charCounts).toEqual({
    correct: 5,
    incorrect: 0,
    extra: 0,
    missed: 0,
    exactWords: 5,
  });
  // 5 characters in 2 s: 5 / 5 / (2 / 60) = 30.
  expect(result.wpm).toBe(30);
});

test("CHARS-6: an active word without input adds nothing", () => {
  expect(countsAfterTyping("cat ")).toEqual({
    correct: 4,
    incorrect: 0,
    extra: 0,
    missed: 0,
    exactWords: 4,
  });
});

test("CHARS-6: a validated word of a time Game still counts its untyped characters as missed", () => {
  // "c ": "c" correct, the space where "a" is expected is incorrect, "t" and the separator missed.
  // "do": the correct start of the active word.
  expect(countsAfterTyping("c do")).toEqual({
    correct: 3,
    incorrect: 1,
    extra: 0,
    missed: 2,
    exactWords: 2,
  });
});

test("CHARS-7: an active word whose input is not a correct start of the target is not credited in the WPM", () => {
  const game = createGame({ mode: "time", seconds: 2 }, ["cat", "dog", "sun"]);
  const finished = applyEvent(typeText(game, "cat dx", 0, 100), { type: "tick", at: 2000 });

  const result = getResult(finished);

  // "dx": "d" is correct but earns no exact-word credit, "x" is incorrect, nothing is missed.
  expect(result.charCounts).toEqual({
    correct: 5,
    incorrect: 1,
    extra: 0,
    missed: 0,
    exactWords: 4,
  });
  // WPM: 4 / 5 / (2 / 60) = 24. Raw: 6 / 5 / (2 / 60) = 36.
  expect(result.wpm).toBe(24);
  expect(result.rawWpm).toBe(36);
});

test("CHARS-8: a letter typed on the separator position of a word that is not validated is extra", () => {
  // Active word "dogxy": "dog" correct, "x" on the separator position and "y" beyond the target are extra.
  expect(countsAfterTyping("cat dogxy")).toEqual({
    correct: 7,
    incorrect: 0,
    extra: 2,
    missed: 0,
    exactWords: 4,
  });
});

test("CHARS-9: the words after the active word are not counted", () => {
  // "sun " is never reached: none of its characters is missed.
  expect(countsAfterTyping("c")).toEqual({
    correct: 1,
    incorrect: 0,
    extra: 0,
    missed: 0,
    exactWords: 1,
  });
});

test("CHARS-9: a time Game whose words are all validated counts them as validated words", () => {
  // The active word waits beyond the list: "cax " is wrong and gets no partial credit.
  expect(countsAfterTyping("cax ", ["cat"])).toEqual({
    correct: 2,
    incorrect: 2,
    extra: 0,
    missed: 0,
    exactWords: 0,
  });
});

test("ACC-1: the accuracy of a time Game counts every keystroke up to the ending Tick", () => {
  const game = createGame({ mode: "time", seconds: 2 }, ["cat", "dog"]);
  // 4 keystrokes, 3 correct: only "x" is incorrect.
  const finished = applyEvent(typeText(game, "cax ", 0, 100), { type: "tick", at: 2000 });

  expect(getResult(finished).accuracy).toBe(75);
});

test("CHARS-8: a word the player went back to is no longer validated, and its letter on the separator position is extra", () => {
  const game = createGame({ mode: "time", seconds: 2 }, ["cat", "dog"]);
  // "catx " is validated, then the deletion goes back to it and takes its space off: "catx".
  const back = applyEvent(typeText(game, "catx ", 0, 100), {
    type: "delete",
    at: 600,
    unit: "char",
  });

  const finished = applyEvent(back, { type: "tick", at: 2000 });

  expect(getResult(finished).charCounts).toEqual({
    correct: 3,
    incorrect: 0,
    extra: 1,
    missed: 0,
    exactWords: 0,
  });
});

test("CHARS-9: a word the player left by going back is not counted", () => {
  const game = createGame({ mode: "time", seconds: 2 }, ["cat", "dog"]);
  // "cax d", then "d" is deleted and a second deletion goes back to "cax".
  const typing = typeText(game, "cax d", 0, 100);
  const emptied = applyEvent(typing, { type: "delete", at: 600, unit: "char" });
  const back = applyEvent(emptied, { type: "delete", at: 700, unit: "char" });

  const finished = applyEvent(back, { type: "tick", at: 2000 });

  // "cax" is the active word: "x" is incorrect, the separator and "dog " are not missed.
  expect(getResult(finished).charCounts).toEqual({
    correct: 2,
    incorrect: 1,
    extra: 0,
    missed: 0,
    exactWords: 0,
  });
});
