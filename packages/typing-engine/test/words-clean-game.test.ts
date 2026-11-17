import { expect, test } from "bun:test";
import { applyEvent, createGame } from "../src/index.ts";
import { typeText } from "./helpers/typing.ts";

test("GAME-1: a words Game exposes its target words, an empty input per word, the active word and its status", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["ab", "cd"]);

  expect(game.targetWords).toEqual(["ab ", "cd"]);
  expect(game.inputs).toEqual(["", ""]);
  expect(game.activeWordIndex).toBe(0);
  expect(game.status).toBe("ready");
});

test("GAME-2: a words Game keeps only the first words of the list, up to its word count", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["ab", "cd", "ef"]);

  expect(game.targetWords).toEqual(["ab ", "cd"]);
  expect(game.inputs).toEqual(["", ""]);
});

test("GAME-3: creating a words Game is refused when the list has fewer words than the word count", () => {
  expect(() => createGame({ mode: "words", wordCount: 3 }, ["ab", "cd"])).toThrow(RangeError);
});

test("GAME-3: creating a words Game is refused when the word count is not a positive integer", () => {
  expect(() => createGame({ mode: "words", wordCount: 0 }, ["ab"])).toThrow(RangeError);
  expect(() => createGame({ mode: "words", wordCount: 1.5 }, ["ab", "cd"])).toThrow(RangeError);
});

test("SEP-1: every target word carries a space as separator, except the last one", () => {
  const game = createGame({ mode: "words", wordCount: 3 }, ["ab", "cd", "ef"]);

  expect(game.targetWords).toEqual(["ab ", "cd ", "ef"]);
});

test("START-1: the clock starts at the first text insertion", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["ab", "cd"]);
  expect(game.startedAt).toBeNull();

  const started = applyEvent(game, { type: "insert", at: 1500, text: "a" });
  expect(started.status).toBe("running");
  expect(started.startedAt).toBe(1500);

  const later = applyEvent(started, { type: "insert", at: 1800, text: "b" });
  expect(later.startedAt).toBe(1500);
});

test("INS-1: a correct insertion advances in the active word", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["ab", "cd"]);

  const afterA = applyEvent(game, { type: "insert", at: 0, text: "a" });
  expect(afterA.inputs).toEqual(["a", ""]);
  expect(afterA.activeWordIndex).toBe(0);

  const afterB = applyEvent(afterA, { type: "insert", at: 100, text: "b" });
  expect(afterB.inputs).toEqual(["ab", ""]);
  expect(afterB.activeWordIndex).toBe(0);
});

test("INS-2: the expected space validates the word and moves to the next one", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["ab", "cd"]);

  const validated = typeText(game, "ab ", 0, 100);
  expect(validated.inputs).toEqual(["ab ", ""]);
  expect(validated.activeWordIndex).toBe(1);
  expect(validated.status).toBe("running");

  const next = applyEvent(validated, { type: "insert", at: 300, text: "c" });
  expect(next.inputs).toEqual(["ab ", "c"]);
});

test("INS-3: an insertion of several characters is applied one character at a time", () => {
  const game = createGame({ mode: "words", wordCount: 3 }, ["ab", "cd", "ef"]);

  const pasted = applyEvent(game, { type: "insert", at: 700, text: "ab c" });
  expect(pasted.inputs).toEqual(["ab ", "c", ""]);
  expect(pasted.activeWordIndex).toBe(1);
  expect(pasted.startedAt).toBe(700);
});

test("END-1: a words Game ends as soon as the input of the last word is exactly that word, without a final space", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["ab", "cd"]);

  const almost = typeText(game, "ab c", 1000, 100);
  expect(almost.status).toBe("running");
  expect(almost.endedAt).toBeNull();

  const finished = applyEvent(almost, { type: "insert", at: 1400, text: "d" });
  expect(finished.status).toBe("finished");
  expect(finished.endedAt).toBe(1400);
  expect(finished.inputs).toEqual(["ab ", "cd"]);
  expect(finished.activeWordIndex).toBe(1);
});

test("END-2: an Event applied to a finished Game does not change it", () => {
  const game = createGame({ mode: "words", wordCount: 1 }, ["ab"]);
  const finished = typeText(game, "ab", 0, 100);
  expect(finished.status).toBe("finished");

  expect(applyEvent(finished, { type: "insert", at: 5000, text: "x" })).toEqual(finished);
});

test("END-2: the characters of an insertion that follow the end of the Game are ignored", () => {
  const game = createGame({ mode: "words", wordCount: 1 }, ["ab"]);

  const finished = applyEvent(game, { type: "insert", at: 0, text: "abcd" });
  expect(finished.status).toBe("finished");
  expect(finished.inputs).toEqual(["ab"]);
});

test("PURE-1: applying an Event never modifies the Game received as input", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["ab", "cd"]);
  const running = typeText(game, "ab", 0, 100);
  const snapshot = structuredClone(running);

  const next = applyEvent(running, { type: "insert", at: 200, text: " " });

  expect(running).toEqual(snapshot);
  expect(next).not.toEqual(snapshot);
});
