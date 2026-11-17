import { expect, test } from "bun:test";
import { applyEvent, createGame } from "../src/index.ts";
import { typeText } from "./helpers/typing.ts";

test("INS-4: an insertion that is not the expected character stays in the input and is an incorrect keystroke", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["ab", "cd"]);

  const mistyped = typeText(game, "ax", 0, 100);

  expect(mistyped.inputs).toEqual(["ax", ""]);
  expect(mistyped.activeWordIndex).toBe(0);
  expect(mistyped.keystrokes.map((keystroke) => keystroke.correct)).toEqual([true, false]);
});

test("INS-4: a letter typed where the separator is expected is incorrect", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["ab", "cd"]);

  const mistyped = typeText(game, "abx", 0, 100);

  expect(mistyped.inputs).toEqual(["abx", ""]);
  expect(mistyped.keystrokes.at(-1)).toEqual({
    at: 200,
    wordIndex: 0,
    charIndex: 2,
    char: "x",
    correct: false,
  });
});

test("INS-4: an insertion beyond the target word is incorrect", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["ab", "cd"]);

  // "ab " is 3 characters long: "y" lands at position 3, beyond the target.
  const mistyped = typeText(game, "abxy", 0, 100);

  expect(mistyped.inputs).toEqual(["abxy", ""]);
  expect(mistyped.keystrokes.at(-1)).toEqual({
    at: 300,
    wordIndex: 0,
    charIndex: 3,
    char: "y",
    correct: false,
  });
});

test("INS-5: a space on an empty input is ignored: the Game does not change and no keystroke is logged", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["ab", "cd"]);

  const ignored = applyEvent(game, { type: "insert", at: 500, text: " " });

  expect(ignored).toEqual(game);
  expect(ignored.status).toBe("ready");
  expect(ignored.startedAt).toBeNull();
});

test("INS-5: a space on the empty input of a later word does not skip that word", () => {
  const game = createGame({ mode: "words", wordCount: 3 }, ["ab", "cd", "ef"]);
  const validated = typeText(game, "ab ", 0, 100);

  const ignored = applyEvent(validated, { type: "insert", at: 300, text: " " });

  expect(ignored).toEqual(validated);
});

test("INS-6: a space on a wrong word validates it and moves to the next word", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["ab", "cd"]);

  const validated = typeText(game, "ax ", 0, 100);

  expect(validated.inputs).toEqual(["ax ", ""]);
  expect(validated.activeWordIndex).toBe(1);
  expect(validated.status).toBe("running");
});

test("INS-6: a space on an incomplete word validates it and is an incorrect keystroke", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["abc", "de"]);

  const skipped = typeText(game, "a ", 0, 100);

  expect(skipped.inputs).toEqual(["a ", ""]);
  expect(skipped.activeWordIndex).toBe(1);
  expect(skipped.keystrokes.at(-1)).toEqual({
    at: 100,
    wordIndex: 0,
    charIndex: 1,
    char: " ",
    correct: false,
  });
});

test("INS-6: the space typed at the separator position of a wrong word is a correct keystroke", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["ab", "cd"]);

  const validated = typeText(game, "ax ", 0, 100);

  expect(validated.keystrokes.map((keystroke) => keystroke.correct)).toEqual([true, false, true]);
});

test("INS-6: a space after extra characters validates the word", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["ab", "cd"]);

  const validated = typeText(game, "abxy c", 0, 100);

  expect(validated.inputs).toEqual(["abxy ", "c"]);
  expect(validated.activeWordIndex).toBe(1);
});

test("END-3: a space on a wrong last word ends the Game, at the instant of that space", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["ab", "cd"]);
  const wrong = typeText(game, "ab cx", 0, 100);
  expect(wrong.status).toBe("running");

  const finished = applyEvent(wrong, { type: "insert", at: 900, text: " " });

  expect(finished.status).toBe("finished");
  expect(finished.endedAt).toBe(900);
  expect(finished.activeWordIndex).toBe(1);
});

test("END-3: the space that ends the Game on a wrong last word is removed from the input but stays an incorrect keystroke", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["ab", "cd"]);

  const finished = typeText(game, "ab cx ", 0, 100);

  expect(finished.inputs).toEqual(["ab ", "cx"]);
  expect(finished.keystrokes).toHaveLength(6);
  expect(finished.keystrokes.at(-1)).toEqual({
    at: 500,
    wordIndex: 1,
    charIndex: 2,
    char: " ",
    correct: false,
  });
});

test("END-3: a space on an incomplete last word ends the Game", () => {
  const game = createGame({ mode: "words", wordCount: 1 }, ["abc"]);

  const finished = typeText(game, "a ", 0, 100);

  expect(finished.status).toBe("finished");
  expect(finished.inputs).toEqual(["a"]);
  expect(finished.keystrokes.at(-1)?.correct).toBe(false);
});

test("INS-7: the input of a word is capped at the length of its target, separator included, plus 20", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["ab", "cd"]);
  // "ab " is 3 characters long: the cap is 23.
  const full = typeText(game, "ab" + "x".repeat(21), 0, 10);
  expect(full.inputs[0]).toHaveLength(23);
  expect(full.keystrokes).toHaveLength(23);

  const refused = applyEvent(full, { type: "insert", at: 5000, text: "y" });

  expect(refused).toEqual(full);
});

test("INS-7: the cap of the last word counts from a target without separator", () => {
  const game = createGame({ mode: "words", wordCount: 1 }, ["ab"]);

  // The cap is 22: the 23rd and 24th characters are refused.
  const full = typeText(game, "x".repeat(24), 0, 10);

  expect(full.inputs).toEqual(["x".repeat(22)]);
  expect(full.keystrokes).toHaveLength(22);
});

test("INS-7: a space is still accepted on a full input and validates the word", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["ab", "cd"]);
  const full = typeText(game, "ab" + "x".repeat(21), 0, 10);

  const validated = applyEvent(full, { type: "insert", at: 5000, text: " " });

  expect(validated.inputs[0]).toBe("ab" + "x".repeat(21) + " ");
  expect(validated.activeWordIndex).toBe(1);
  expect(validated.keystrokes).toHaveLength(24);
});

// The 14 space characters Monkeytype recognises, U+0020 included.
const UNICODE_SPACES = [" ", " ", " ", " ", " ", " ", " ", " ", " ", " ", "​", " ", "　", "﻿"];

test("INS-8: each recognised Unicode space is stored and logged as a regular space, and validates the word", () => {
  for (const space of UNICODE_SPACES) {
    const game = createGame({ mode: "words", wordCount: 2 }, ["ab", "cd"]);

    const validated = typeText(game, "ab" + space, 0, 100);

    expect(validated.inputs).toEqual(["ab ", ""]);
    expect(validated.activeWordIndex).toBe(1);
    expect(validated.keystrokes.at(-1)).toEqual({
      at: 200,
      wordIndex: 0,
      charIndex: 2,
      char: " ",
      correct: true,
    });
  }
});

test("INS-8: a recognised Unicode space on an empty input is ignored like a regular space", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["ab", "cd"]);

  for (const space of UNICODE_SPACES) {
    expect(applyEvent(game, { type: "insert", at: 0, text: space })).toEqual(game);
  }
});

test("INS-8: a blank character outside the recognised list is an ordinary incorrect character", () => {
  // Unicode spaces that Monkeytype does not recognise, then tab and newline.
  for (const blank of [" ", " ", " ", " ", " ", "\t", "\n"]) {
    const game = createGame({ mode: "words", wordCount: 2 }, ["ab", "cd"]);

    const mistyped = typeText(game, "ab" + blank, 0, 100);

    expect(mistyped.inputs).toEqual(["ab" + blank, ""]);
    expect(mistyped.activeWordIndex).toBe(0);
    expect(mistyped.keystrokes.at(-1)).toEqual({
      at: 200,
      wordIndex: 0,
      charIndex: 2,
      char: blank,
      correct: false,
    });
  }
});

test("END-3: a space on the empty input of the last word does not end the Game", () => {
  const game = createGame({ mode: "words", wordCount: 2 }, ["ab", "cd"]);
  const validated = typeText(game, "ab ", 0, 100);

  const ignored = applyEvent(validated, { type: "insert", at: 300, text: " " });

  expect(ignored).toEqual(validated);
});
