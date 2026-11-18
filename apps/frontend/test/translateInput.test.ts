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

test("an input type other than insertText produces no Event", () => {
  expect(translateInput({ inputType: "insertFromPaste", data: "pasted" }, 0)).toBeNull();
});
