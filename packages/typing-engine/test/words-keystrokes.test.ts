import { expect, test } from "bun:test";
import { applyEvent, createGame } from "../src/index.ts";
import { typeText } from "./helpers/typing.ts";

test("KEY-1: the keystroke log has one entry per judged insertion, with its instant, word index, position, character and correctness", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["ab", "cd"]);
  expect(game.keystrokes).toEqual([]);

  // Insertions at 1000, 1100, 1200, 1300 and 1400 ms.
  const finished = typeText(game, "ab cd", 1000, 100);

  expect(finished.keystrokes).toEqual([
    { at: 1000, wordIndex: 0, charIndex: 0, char: "a", correct: true },
    { at: 1100, wordIndex: 0, charIndex: 1, char: "b", correct: true },
    { at: 1200, wordIndex: 0, charIndex: 2, char: " ", correct: true },
    { at: 1300, wordIndex: 1, charIndex: 0, char: "c", correct: true },
    { at: 1400, wordIndex: 1, charIndex: 1, char: "d", correct: true },
  ]);
});

test("KEY-1: an incorrect insertion is logged with the character typed, not the expected one", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["ab", "cd"]);

  const mistyped = typeText(game, "ax", 0, 100);

  expect(mistyped.keystrokes).toEqual([
    { at: 0, wordIndex: 0, charIndex: 0, char: "a", correct: true },
    { at: 100, wordIndex: 0, charIndex: 1, char: "x", correct: false },
  ]);
});

test("KEY-1: the keystroke log is plain data that survives a JSON round trip", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["ab", "cd"]);
  const finished = typeText(game, "ax cd", 0, 100);

  expect(JSON.parse(JSON.stringify(finished.keystrokes))).toEqual(finished.keystrokes);
});

test("KEY-2: a refused insertion leaves no entry in the keystroke log", () => {
  const game = createGame({ mode: "words", wordCount: 1 }, ["ab"]);
  // The leading space is refused, and so is the 23rd character: the cap of "ab" is 22.
  const full = typeText(game, " " + "x".repeat(23), 0, 10);

  expect(full.keystrokes).toHaveLength(22);
  expect(full.keystrokes[0]).toEqual({
    at: 10,
    wordIndex: 0,
    charIndex: 0,
    char: "x",
    correct: false,
  });
});

test("KEY-1: an insertion of several characters gives one keystroke per character, all at the same instant", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["ab", "cd"]);

  const pasted = applyEvent(game, { type: "insert", at: 700, text: "ab" });

  expect(pasted.keystrokes).toEqual([
    { at: 700, wordIndex: 0, charIndex: 0, char: "a", correct: true },
    { at: 700, wordIndex: 0, charIndex: 1, char: "b", correct: true },
  ]);
});
