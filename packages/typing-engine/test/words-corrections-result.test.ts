import { expect, test } from "bun:test";
import { applyEvent, createGame, getResult, type Game } from "../src/index.ts";
import { typeText } from "./helpers/typing.ts";

function deleteChar(game: Game, at: number): Game {
  return applyEvent(game, { type: "delete", at, unit: "char" });
}

function deleteWord(game: Game, at: number): Game {
  return applyEvent(game, { type: "delete", at, unit: "word" });
}

test("DEL-7: deletions add no keystroke to the log and remove none", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);
  const validated = typeText(game, "cax ", 0, 100);
  const logged = [
    { at: 0, wordIndex: 0, charIndex: 0, char: "c", correct: true },
    { at: 100, wordIndex: 0, charIndex: 1, char: "a", correct: true },
    { at: 200, wordIndex: 0, charIndex: 2, char: "x", correct: false },
    { at: 300, wordIndex: 0, charIndex: 3, char: " ", correct: true },
  ];
  expect(validated.keystrokes).toEqual(logged);

  // Back to "cax", then "ca", then an empty input.
  const back = deleteChar(validated, 400);
  const shortened = deleteChar(back, 500);
  const emptied = deleteWord(shortened, 600);

  expect(back.keystrokes).toEqual(logged);
  expect(shortened.keystrokes).toEqual(logged);
  expect(emptied.keystrokes).toEqual(logged);
});

test("DEL-7: a deletion that is ignored adds no keystroke to the log", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);
  const validated = typeText(game, "cat ", 0, 100);

  expect(deleteChar(game, 0).keystrokes).toEqual([]);
  expect(deleteWord(validated, 400).keystrokes).toEqual(validated.keystrokes);
});

test("DEL-8: an incorrect keystroke that is deleted and retyped still counts as incorrect in the accuracy", () => {
  const game = createGame({ mode: "words", wordCount: 1 }, ["cat"]);

  // "cax", deletion, "t": 3 correct keystrokes out of 4.
  const finished = typeText(deleteChar(typeText(game, "cax", 0, 100), 300), "t", 400, 100);

  expect(finished.status).toBe("finished");
  expect(getResult(finished).accuracy).toBe(75);
});

test("DEL-8: the keystrokes of a word gone back to and corrected all count in the accuracy", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);
  // "cax " then back to "cax", "ca", then "t dog".
  const back = deleteChar(deleteChar(typeText(game, "cax ", 0, 100), 400), 500);

  const finished = typeText(back, "t dog", 600, 100);

  // 9 keystrokes ("cax ", "t ", "dog"), 1 incorrect: 8 / 9 = 88.888…
  expect(finished.keystrokes).toHaveLength(9);
  expect(getResult(finished).accuracy).toBe(88.89);
});

test("DEL-8: a word deleted whole and retyped keeps its incorrect keystrokes in the accuracy", () => {
  const game = createGame({ mode: "words", wordCount: 1 }, ["cat"]);

  // "xyz", word deletion, "cat": 3 correct keystrokes out of 6.
  const finished = typeText(deleteWord(typeText(game, "xyz", 0, 100), 300), "cat", 400, 100);

  expect(getResult(finished).accuracy).toBe(50);
});

test("DEL-9: after a correction, the character counts reflect the final input of the word", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);
  const back = deleteChar(deleteChar(typeText(game, "cax ", 0, 100), 400), 500);

  const finished = typeText(back, "t dog", 600, 100);

  expect(getResult(finished).charCounts).toEqual({
    correct: 7,
    incorrect: 0,
    extra: 0,
    missed: 0,
    exactWords: 7,
  });
});

test("DEL-9: characters deleted and not retyped are missed, not incorrect", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);
  // "cax" -> "ca", validated too early: "c" and "a" correct, "t" missed, the space of a wrong word incorrect.
  const validated = typeText(deleteChar(typeText(game, "cax", 0, 100), 300), " ", 400, 100);

  const finished = typeText(validated, "dog", 500, 100);

  expect(getResult(finished).charCounts).toEqual({
    correct: 5,
    incorrect: 1,
    extra: 0,
    missed: 1,
    exactWords: 3,
  });
});

test("DEL-9: a character deleted before going back to the previous word leaves no trace in the counts", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);
  const validated = typeText(game, "cax d", 0, 100);

  // "d" deleted, back to "cax", then "ca", "cat ", and the last word ended by "do ".
  const back = [500, 600, 700].reduce(deleteChar, validated);
  const finished = typeText(back, "t do ", 800, 100);

  expect(finished.inputs).toEqual(["cat ", "do"]);
  expect(getResult(finished).charCounts).toEqual({
    correct: 6,
    incorrect: 0,
    extra: 0,
    missed: 1,
    exactWords: 4,
  });
});

test("RES-2: a word corrected then validated exactly counts in the WPM", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);
  const back = deleteWord(typeText(game, "cax ", 0, 100), 400);

  // Starts at 0 ms, ends at 6000 ms: 7 characters of exact words / 5 / 0.1 min = 14 WPM.
  const finished = typeText(back, "cat dog", 5400, 100);

  expect(getResult(finished).duration).toBe(6);
  expect(getResult(finished).wpm).toBe(14);
  expect(getResult(finished).rawWpm).toBe(14);
});

test("RES-2: without the correction, the same word does not count in the WPM", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["cat", "dog"]);

  // Ends at 6000 ms: only "dog" is exact, 3 / 5 / 0.1 min = 6 WPM.
  const finished = typeText(typeText(game, "cax ", 0, 100), "dog", 5800, 100);

  expect(getResult(finished).wpm).toBe(6);
});
