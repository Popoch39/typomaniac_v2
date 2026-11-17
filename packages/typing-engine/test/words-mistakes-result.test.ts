import { expect, test } from "bun:test";
import { createGame, getResult } from "../src/index.ts";
import { typeText } from "./helpers/typing.ts";

/** Character counts of a 2-word Game on "cat dog" where `firstWord` is typed, then "dog" exactly. */
function countsAfterTyping(firstWord: string) {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);
  return getResult(typeText(game, firstWord + "dog", 0, 100)).charCounts;
}

/** Character counts of a 1-word Game on "dog" ended by `typed`. */
function countsOfLastWord(typed: string) {
  const game = createGame({ mode: "words", wordCount: 1 }, ["dog"]);
  return getResult(typeText(game, typed, 0, 100)).charCounts;
}

test("CHARS-1: a Game without mistake counts every character as correct and as a character of an exact word", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);

  const finished = typeText(game, "cat dog", 0, 100);

  expect(getResult(finished).charCounts).toEqual({
    correct: 7,
    incorrect: 0,
    extra: 0,
    missed: 0,
    exactWords: 7,
  });
});

test("CHARS-1: the correct characters of a wrong word are counted, but not as characters of an exact word", () => {
  // "cot ": "c" and "t" are correct; "dog" brings 3 correct characters of an exact word.
  const counts = countsAfterTyping("cot ");

  expect(counts.correct).toBe(5);
  expect(counts.exactWords).toBe(3);
});

test("CHARS-2: a character that differs from the target character at its position is incorrect", () => {
  // Last word "dox": "d" and "o" correct, "x" incorrect.
  expect(countsOfLastWord("dox ")).toEqual({
    correct: 2,
    incorrect: 1,
    extra: 0,
    missed: 0,
    exactWords: 0,
  });
});

test("CHARS-3: the separator of a wrong word is incorrect even when typed at its position", () => {
  // "cax ": "c" and "a" correct, "x" and the space incorrect; then "dog" exact.
  expect(countsAfterTyping("cax ")).toEqual({
    correct: 5,
    incorrect: 2,
    extra: 0,
    missed: 0,
    exactWords: 3,
  });
});

test("CHARS-4: a letter typed on the separator position is incorrect and the space that follows is extra", () => {
  // "catx ": "cat" correct, "x" incorrect, the space is beyond the target; then "dog" exact.
  expect(countsAfterTyping("catx ")).toEqual({
    correct: 6,
    incorrect: 1,
    extra: 1,
    missed: 0,
    exactWords: 3,
  });
});

test("CHARS-4: every character beyond the target is extra, the validating space included", () => {
  // "catxy ": "cat" correct, "x" incorrect, "y" and the space extra; then "dog" exact.
  expect(countsAfterTyping("catxy ")).toEqual({
    correct: 6,
    incorrect: 1,
    extra: 2,
    missed: 0,
    exactWords: 3,
  });
});

test("CHARS-4: extra letters on the last word are extra, without the space that ended the Game", () => {
  // Last word "dxgs": "d" and "g" correct, "x" incorrect, "s" extra; the final space is not stored.
  expect(countsOfLastWord("dxgs ")).toEqual({
    correct: 2,
    incorrect: 1,
    extra: 1,
    missed: 0,
    exactWords: 0,
  });
});

test("CHARS-5: the untyped characters of a word validated too early are missed", () => {
  // "ca ": "c" and "a" correct, the space where "t" is expected is incorrect, the separator is missed.
  expect(countsAfterTyping("ca ")).toEqual({
    correct: 5,
    incorrect: 1,
    extra: 0,
    missed: 1,
    exactWords: 3,
  });
});

test("CHARS-5: a skipped word counts its untyped characters as missed", () => {
  // "c ": "c" correct, the space where "a" is expected is incorrect, "t" and the separator missed.
  expect(countsAfterTyping("c ")).toEqual({
    correct: 4,
    incorrect: 1,
    extra: 0,
    missed: 2,
    exactWords: 3,
  });
});

test("CHARS-5: the untyped characters of an unfinished last word are missed", () => {
  // Last word "do": "d" and "o" correct, "g" missed; the final space is not stored.
  expect(countsOfLastWord("do ")).toEqual({
    correct: 2,
    incorrect: 0,
    extra: 0,
    missed: 1,
    exactWords: 0,
  });
});

test("RES-2: the WPM only counts the characters of the words typed exactly", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);
  // Insertions at 0, 200, 400, 600, 800, 1000 and 2000 ms: 2 s.
  const finished = typeText(typeText(game, "cax do", 0, 200), "g", 2000, 0);

  // Only "dog" is exact: 3 characters in 2 s, 3 / 5 / (2 / 60) = 18.
  expect(getResult(finished).wpm).toBe(18);
});

test("RES-2: the WPM is 0 when no word is typed exactly", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);
  const finished = typeText(typeText(game, "cax dox", 0, 200), " ", 2000, 0);

  expect(getResult(finished).wpm).toBe(0);
});

test("END-3: a Game ended by a space on a wrong last word gives a complete Result", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);
  // Insertions at 0, 200, …, 1200 ms, then the final space at 2000 ms.
  const finished = typeText(typeText(game, "cax dox", 0, 200), " ", 2000, 0);

  // "cax ": 2 correct, 2 incorrect. "dox": 2 correct, 1 incorrect. Raw: 7 / 5 / (2 / 60) = 42.
  // 8 keystrokes, 5 correct ("c", "a", the first space, "d", "o").
  expect(getResult(finished)).toEqual({
    duration: 2,
    wpm: 0,
    rawWpm: 42,
    accuracy: 62.5,
    charCounts: { correct: 4, incorrect: 3, extra: 0, missed: 0, exactWords: 0 },
  });
});

test("RES-3: the raw WPM counts the correct, incorrect and extra characters, not the missed ones", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);
  // "catxy ": 3 correct, 1 incorrect, 2 extra. "d ": 1 correct, 2 missed, the final space is not stored.
  // Insertions at 0, 200, …, 1200 ms, then the final space at 2000 ms: 2 s.
  const finished = typeText(typeText(game, "catxy d", 0, 200), " ", 2000, 0);

  // 7 characters in 2 s: 7 / 5 / (2 / 60) = 42.
  expect(getResult(finished).rawWpm).toBe(42);
});

test("ACC-1: the accuracy is the share of correct keystrokes among all keystrokes, as a percentage", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["ab", "cd"]);
  // Keystrokes: "a" correct, "x" incorrect, the space correct, "c" and "d" correct.
  const finished = typeText(game, "ax cd", 0, 100);

  expect(getResult(finished).accuracy).toBe(80);
});

test("ACC-1: the accuracy is rounded to 2 decimals", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);
  // 7 keystrokes, 6 correct: only "x" is incorrect. 600 / 7 = 85.714…
  const finished = typeText(game, "cax dog", 0, 100);

  expect(getResult(finished).accuracy).toBe(85.71);
});

test("ACC-1: the space that ends the Game on a wrong last word is an incorrect keystroke of the accuracy", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);
  // 8 keystrokes, 5 correct ("c", "a", the first space, "d", "o"): "x", "x" and the final space are incorrect.
  const finished = typeText(game, "cax dox ", 0, 100);

  expect(getResult(finished).accuracy).toBe(62.5);
});

test("ACC-1: a refused insertion does not count in the accuracy", () => {
  const game = createGame({ mode: "words", wordCount: 1 }, ["ab"]);
  // The leading spaces are refused: 2 keystrokes, both correct.
  const finished = typeText(game, "  ab", 0, 100);

  expect(getResult(finished).accuracy).toBe(100);
});

test("ACC-1: a Game without mistake has an accuracy of 100", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["ab", "cd"]);

  expect(getResult(typeText(game, "ab cd", 0, 100)).accuracy).toBe(100);
});
