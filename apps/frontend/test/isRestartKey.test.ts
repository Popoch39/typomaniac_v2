import { expect, test } from "bun:test";
import { isRestartKey } from "../src/features/game/input/isRestartKey.ts";

test("Tab is the restart key", () => {
  expect(isRestartKey({ code: "Tab" })).toBe(true);
});

test("a key that writes is not the restart key", () => {
  expect(isRestartKey({ code: "KeyA" })).toBe(false);
});
