import { expect, test } from "bun:test";
import type { GameEvent } from "@repo/typing-engine";
import { findViolation, NO_KEYS_PAIRED, pairKeys } from "../src/index.ts";

const keyDown = (code: string): GameEvent => ({ type: "keyDown", at: 0, code });
const keyUp = (code: string): GameEvent => ({ type: "keyUp", at: 0, code });
const insert = (text: string): GameEvent => ({ type: "insert", at: 0, text });

/** The Violation of each Event of a journal, in order, as the server finds them on receipt. */
function violationsOf(journal: readonly GameEvent[]) {
  let pairing = NO_KEYS_PAIRED;
  return journal.map((event) => {
    const violation = findViolation(pairing, event);
    pairing = pairKeys(pairing, event);
    return violation;
  });
}

/** A word typed one key at a time, each key released before the next goes down. */
const typed = (word: string): GameEvent[] =>
  word.split("").flatMap((char) => {
    const code = char === " " ? "Space" : `Key${char.toUpperCase()}`;
    return [keyDown(code), insert(char), keyUp(code)];
  });

test("VIOLATION-1: an insert of more than one character is a Violation, even after a keyDown", () => {
  expect(violationsOf([insert("word ")])).toEqual(["multipleCharacters"]);
  expect(violationsOf([keyDown("KeyW"), insert("wo")])).toEqual([null, "multipleCharacters"]);
});

test("VIOLATION-2: a one-character insert with no keyDown before it is a Violation", () => {
  expect(violationsOf([insert("a")])).toEqual(["noKeyPress"]);
});

test("VIOLATION-2: a word typed one key at a time has no Violation", () => {
  expect(violationsOf(typed("word ")).every((violation) => violation === null)).toBe(true);
});

test("VIOLATION-3: a keyDown accounts for one insert only", () => {
  expect(violationsOf([keyDown("KeyA"), keyUp("KeyA"), insert("a"), insert("b")])).toEqual([
    null,
    null,
    null,
    "noKeyPress",
  ]);
});

test("VIOLATION-3: keyDowns do not add up: several before an insert still account for that insert only", () => {
  expect(
    violationsOf([keyDown("Enter"), keyDown("KeyA"), insert("a"), keyUp("KeyA"), insert("b")]),
  ).toEqual([null, null, null, null, "noKeyPress"]);
});

test("VIOLATION-4: with key rollover, the next key down before the last is released accounts for its own insert", () => {
  expect(
    violationsOf([
      keyDown("KeyT"),
      insert("t"),
      keyDown("KeyH"),
      insert("h"),
      keyUp("KeyT"),
      keyDown("KeyE"),
      insert("e"),
      keyUp("KeyH"),
      keyUp("KeyE"),
    ]).every((violation) => violation === null),
  ).toBe(true);
});

test("VIOLATION-5: a held key repeats its character without a new keyDown", () => {
  expect(
    violationsOf([keyDown("KeyE"), insert("e"), insert("e"), insert("e"), keyUp("KeyE")]),
  ).toEqual([null, null, null, null, null]);
});

test("VIOLATION-5: a held key accounts for no other character than its own", () => {
  expect(violationsOf([keyDown("KeyE"), insert("e"), insert("x")])).toEqual([
    null,
    null,
    "noKeyPress",
  ]);
});

test("VIOLATION-5: a released key repeats nothing", () => {
  expect(violationsOf([keyDown("KeyE"), insert("e"), keyUp("KeyE"), insert("e")])).toEqual([
    null,
    null,
    null,
    "noKeyPress",
  ]);
});

test("VIOLATION-5: with key rollover, releasing the earlier key leaves the later one repeating", () => {
  expect(
    violationsOf([
      keyDown("KeyA"),
      insert("a"),
      keyDown("KeyB"),
      insert("b"),
      keyUp("KeyA"),
      insert("b"),
    ]),
  ).toEqual([null, null, null, null, null, null]);
});

test("VIOLATION-6: an Event other than an insert is never a Violation, and a deletion leaves the pairing as it was", () => {
  const others: GameEvent[] = [
    { type: "start", at: 0 },
    keyDown("KeyA"),
    keyUp("KeyA"),
    { type: "delete", at: 0, unit: "char" },
    { type: "delete", at: 0, unit: "word" },
    { type: "tick", at: 0 },
    { type: "addWords", words: ["word"] },
  ];
  expect(violationsOf(others).every((violation) => violation === null)).toBe(true);
  expect(
    violationsOf([keyDown("KeyA"), { type: "delete", at: 0, unit: "char" }, insert("a")]),
  ).toEqual([null, null, null]);
});

test("VIOLATION-7: the pairing is plain JSON and is never mutated", () => {
  const pairing = pairKeys(pairKeys(NO_KEYS_PAIRED, keyDown("KeyA")), insert("a"));
  const before = structuredClone(pairing);
  pairKeys(pairing, keyUp("KeyA"));
  findViolation(pairing, insert("b"));
  expect(pairing).toEqual(before);
  expect(JSON.parse(JSON.stringify(pairing))).toEqual(pairing);
});
