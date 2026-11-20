import { expect, test } from "bun:test";
import { findViolation, NO_KEYS_PAIRED, pairKeys } from "@repo/duel-engine";
import type { GameEvent } from "@repo/typing-engine";
import { type BrowserInput, translateInput } from "../src/features/game/input/translateInput.ts";
import { type BrowserKey, translateKey } from "../src/features/game/input/translateKey.ts";

// What a browser dispatches as a Player types, in order: each key's `keydown`, the `beforeinput`
// it causes, and its `keyup`, as plain data.
type BrowserEvent =
  | ({ readonly kind: "key" } & BrowserKey)
  | ({ readonly kind: "input" } & BrowserInput);

const down = (code: string, repeat = false): BrowserEvent => ({
  kind: "key",
  type: "keydown",
  code,
  repeat,
});
const up = (code: string): BrowserEvent => ({ kind: "key", type: "keyup", code, repeat: false });
const text = (data: string): BrowserEvent => ({ kind: "input", inputType: "insertText", data });
const backspace: BrowserEvent = { kind: "input", inputType: "deleteContentBackward", data: null };

const codeOf = (char: string) => (char === " " ? "Space" : `Key${char.toUpperCase()}`);

// The Events the game's client sends for these browser events, and the Violations the server finds.
function violationsOf(browserEvents: readonly BrowserEvent[]) {
  const sent = browserEvents.flatMap((browserEvent, at): GameEvent[] => {
    const event =
      browserEvent.kind === "key"
        ? translateKey(browserEvent, at)
        : translateInput(browserEvent, at);
    return event === null ? [] : [event];
  });
  let pairing = NO_KEYS_PAIRED;
  return sent.flatMap((event) => {
    const violation = findViolation(pairing, event);
    pairing = pairKeys(pairing, event);
    return violation === null ? [] : [violation];
  });
}

test("words typed one key at a time on a physical keyboard send no Violation", () => {
  const typed = "the quick brown fox "
    .split("")
    .flatMap((char) => [down(codeOf(char)), text(char), up(codeOf(char))]);
  expect(violationsOf(typed)).toEqual([]);
});

test("key rollover, a held key's auto-repeats, Backspace and Shift send no Violation", () => {
  expect(
    violationsOf([
      // Rollover: the next key goes down before the last one is released.
      down("KeyT"),
      text("t"),
      down("KeyH"),
      text("h"),
      up("KeyT"),
      down("KeyE"),
      text("e"),
      up("KeyH"),
      // Held: the browser repeats the `keydown`, which the client drops, and the character.
      down("KeyE", true),
      text("e"),
      down("KeyE", true),
      text("e"),
      up("KeyE"),
      // Correcting: Backspace, a key the client does not send, deletes; Shift is not sent either.
      down("Backspace"),
      backspace,
      up("Backspace"),
      down("ShiftLeft"),
      down("KeyE"),
      text("E"),
      up("KeyE"),
      up("ShiftLeft"),
    ]),
  ).toEqual([]);
});

test("a pasted text sends nothing, so no Violation either", () => {
  expect(
    violationsOf([{ kind: "input", inputType: "insertFromPaste", data: "the quick" }]),
  ).toEqual([]);
});

test("a changed client inserting a word at once, or a letter with no key down, is caught", () => {
  expect(violationsOf([down("KeyT"), text("the "), up("KeyT"), text("q")])).toEqual([
    "multipleCharacters",
    "noKeyPress",
  ]);
});
