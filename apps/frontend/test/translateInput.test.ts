import { expect, test } from "bun:test";
import { translateInput } from "../src/features/game/input/translateInput.ts";

test("insertText becomes an insert Event stamped with the given instant", () => {
  expect(translateInput({ inputType: "insertText", data: "a" }, 1234.5)).toEqual({
    type: "insert",
    at: 1234.5,
    text: "a",
  });
});

test("insertText without data produces no Event", () => {
  expect(translateInput({ inputType: "insertText", data: null }, 0)).toBeNull();
});

test("deleteContentBackward becomes a delete Event of a character", () => {
  expect(translateInput({ inputType: "deleteContentBackward", data: null }, 1234.5)).toEqual({
    type: "delete",
    at: 1234.5,
    unit: "char",
  });
});

test("deleteWordBackward becomes a delete Event of a word", () => {
  expect(translateInput({ inputType: "deleteWordBackward", data: null }, 1234.5)).toEqual({
    type: "delete",
    at: 1234.5,
    unit: "word",
  });
});

test("pasted text produces no Event", () => {
  expect(translateInput({ inputType: "insertFromPaste", data: "pasted" }, 0)).toBeNull();
});

test("dropped text produces no Event", () => {
  expect(translateInput({ inputType: "insertFromDrop", data: "dropped" }, 0)).toBeNull();
});

test("composition text produces no Event", () => {
  expect(translateInput({ inputType: "insertCompositionText", data: "é" }, 0)).toBeNull();
});
