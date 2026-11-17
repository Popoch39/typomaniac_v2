import { expect, test } from "bun:test";
import { applyEvent, createGame, type Game } from "../src/index.ts";
import { typeText } from "./helpers/typing.ts";

function deleteChar(game: Game, at: number): Game {
  return applyEvent(game, { type: "delete", at, unit: "char" });
}

function deleteWord(game: Game, at: number): Game {
  return applyEvent(game, { type: "delete", at, unit: "word" });
}

test("DEL-1: deleting a character removes the last character of the active word's input", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);
  const mistyped = typeText(game, "cax", 0, 100);

  const corrected = deleteChar(mistyped, 300);

  expect(corrected.inputs).toEqual(["ca", ""]);
  expect(corrected.activeWordIndex).toBe(0);
  expect(corrected.status).toBe("running");
});

test("DEL-1: the first word can be deleted down to an empty input", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);
  const typed = typeText(game, "c", 0, 100);

  const emptied = deleteChar(typed, 100);

  expect(emptied.inputs).toEqual(["", ""]);
  // The clock does not go back: the Game stays started.
  expect(emptied.status).toBe("running");
  expect(emptied.startedAt).toBe(0);
});

test("DEL-2: deleting a character on the empty input of the first word is ignored", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);
  const emptied = deleteChar(typeText(game, "c", 0, 100), 100);

  expect(deleteChar(game, 500)).toEqual(game);
  expect(deleteChar(emptied, 500)).toEqual(emptied);
});

test("DEL-3: on an empty input, deleting a character goes back to an incorrect previous word and restores it without its final space", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);
  const validated = typeText(game, "cax ", 0, 100);
  expect(validated.activeWordIndex).toBe(1);

  const back = deleteChar(validated, 400);

  expect(back.inputs).toEqual(["cax", ""]);
  expect(back.activeWordIndex).toBe(0);
});

test("DEL-3: a previous word validated too early or with extra characters is incorrect, so it can be gone back to", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);

  const incomplete = deleteChar(typeText(game, "ca ", 0, 100), 300);
  const extra = deleteChar(typeText(game, "catt ", 0, 100), 500);

  expect(incomplete.inputs).toEqual(["ca", ""]);
  expect(incomplete.activeWordIndex).toBe(0);
  expect(extra.inputs).toEqual(["catt", ""]);
  expect(extra.activeWordIndex).toBe(0);
});

test("DEL-3: a word gone back to is typed again like any active word", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);
  const back = deleteChar(typeText(game, "cax ", 0, 100), 400);

  // "cax" -> "ca" -> "cat ".
  const retyped = typeText(deleteChar(back, 500), "t ", 600, 100);

  expect(retyped.inputs).toEqual(["cat ", ""]);
  expect(retyped.activeWordIndex).toBe(1);
  expect(retyped.keystrokes.slice(-2)).toEqual([
    { at: 600, wordIndex: 0, charIndex: 2, char: "t", correct: true },
    { at: 700, wordIndex: 0, charIndex: 3, char: " ", correct: true },
  ]);
});

test("DEL-3: going back several words needs each previous word to be incorrect in turn", () => {
  const game = createGame({ mode: "words", wordCount: 3 }, ["ab", "cd", "ef"]);
  // Word 0 exact, word 1 wrong.
  const validated = typeText(game, "ab cx ", 0, 100);
  expect(validated.activeWordIndex).toBe(2);

  // Back to word 1 ("cx"), emptied in 2 deletions; the 4th deletion meets the exact word 0.
  const back = [600, 700, 800, 900].reduce(deleteChar, validated);

  expect(back.inputs).toEqual(["ab ", "", ""]);
  expect(back.activeWordIndex).toBe(1);
});

test("DEL-4: on an empty input, a previous word typed exactly cannot be gone back to", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);
  const validated = typeText(game, "cat ", 0, 100);

  expect(deleteChar(validated, 400)).toEqual(validated);
  expect(deleteWord(validated, 400)).toEqual(validated);
});

test("DEL-5: deleting a word removes the last run of non-blank characters of the active word's input", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);
  const mistyped = typeText(game, "cax", 0, 100);

  const emptied = deleteWord(mistyped, 300);

  expect(emptied.inputs).toEqual(["", ""]);
  expect(emptied.activeWordIndex).toBe(0);
  expect(emptied.status).toBe("running");
});

test("DEL-5: deleting a word stops at the blanks that come before the last run of non-blank characters", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);
  // A tab is not a recognised space (INS-8): it stays in the input as a blank character.
  const mistyped = typeText(game, "ca\txy", 0, 100);

  expect(deleteWord(mistyped, 500).inputs).toEqual(["ca\t", ""]);
});

test("DEL-5: deleting a word removes the blanks that follow the last run of non-blank characters with it", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);
  const mistyped = typeText(game, "c\tax\t\n", 0, 100);

  expect(deleteWord(mistyped, 600).inputs).toEqual(["c\t", ""]);
});

test("DEL-5: deleting a word on an input made of blanks only removes those blanks", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);
  const mistyped = typeText(game, "\t\t", 0, 100);

  expect(deleteWord(mistyped, 200).inputs).toEqual(["", ""]);
});

test("DEL-2: deleting a word on the empty input of the first word is ignored", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);
  const emptied = deleteWord(typeText(game, "ca", 0, 100), 200);

  expect(deleteWord(game, 500)).toEqual(game);
  expect(deleteWord(emptied, 500)).toEqual(emptied);
});

test("DEL-6: on an empty input, deleting a word goes back to an incorrect previous word and empties it", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);
  const validated = typeText(game, "cax ", 0, 100);

  const back = deleteWord(validated, 400);

  expect(back.inputs).toEqual(["", ""]);
  expect(back.activeWordIndex).toBe(0);
});

test("DEL-6: a word emptied by going back can be typed again exactly", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);
  const back = deleteWord(typeText(game, "cax ", 0, 100), 400);

  const finished = typeText(back, "cat dog", 500, 100);

  expect(finished.inputs).toEqual(["cat ", "dog"]);
  expect(finished.status).toBe("finished");
});

test("END-2: a deletion applied to a finished Game does not change it", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);
  // The last word is wrong, and so is the first: both deletions would otherwise have something to do.
  const finished = typeText(game, "cax dox ", 0, 100);
  expect(finished.status).toBe("finished");

  expect(deleteChar(finished, 5000)).toEqual(finished);
  expect(deleteWord(finished, 5000)).toEqual(finished);
});

test("PURE-1: applying a deletion never modifies the Game received as input", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);
  const validated = typeText(game, "cax ", 0, 100);
  const snapshot = structuredClone(validated);

  deleteChar(validated, 400);
  deleteWord(validated, 400);

  expect(validated).toEqual(snapshot);
});
