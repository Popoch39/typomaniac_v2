import { expect, test } from "bun:test";
import { translateKey } from "../src/features/game/input/translateInput.ts";

test("a letter key down becomes a keyDown Event stamped with the given instant", () => {
  expect(translateKey({ type: "keydown", code: "KeyA", repeat: false }, 1234.5)).toEqual({
    type: "keyDown",
    at: 1234.5,
    code: "KeyA",
  });
});

test("an auto-repeated key down produces no Event", () => {
  expect(translateKey({ type: "keydown", code: "KeyA", repeat: true }, 0)).toBeNull();
});

test.each([
  "ShiftLeft",
  "ControlRight",
  "AltLeft",
  "MetaLeft",
  "CapsLock",
  "ArrowUp",
  "F5",
  "Backspace",
  "Delete",
  "Escape",
])("the untracked key %s produces no Event, down or up", (code) => {
  expect(translateKey({ type: "keydown", code, repeat: false }, 0)).toBeNull();
  expect(translateKey({ type: "keyup", code, repeat: false }, 0)).toBeNull();
});

test.each([
  "Digit0",
  "Digit9",
  "Backquote",
  "Minus",
  "Equal",
  "BracketLeft",
  "BracketRight",
  "Backslash",
  "IntlBackslash",
  "Semicolon",
  "Quote",
  "Comma",
  "Period",
  "Slash",
  "Space",
  "Enter",
  "Tab",
  "Numpad0",
  "Numpad9",
  "NumpadDecimal",
  "NumpadAdd",
  "NumpadSubtract",
  "NumpadMultiply",
  "NumpadDivide",
  "NumpadEnter",
])("the tracked key %s becomes a KeyPress Event, down and up", (code) => {
  expect(translateKey({ type: "keydown", code, repeat: false }, 0)).toEqual({
    type: "keyDown",
    at: 0,
    code,
  });
  expect(translateKey({ type: "keyup", code, repeat: false }, 0)).toEqual({
    type: "keyUp",
    at: 0,
    code,
  });
});

test("a letter key up becomes a keyUp Event", () => {
  expect(translateKey({ type: "keyup", code: "KeyA", repeat: false }, 10)).toEqual({
    type: "keyUp",
    at: 10,
    code: "KeyA",
  });
});
