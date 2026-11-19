import { expect, test } from "bun:test";
import { ownRowAttributes } from "../src/features/leaderboard/own/ownRowAttributes.ts";
import { OWN_ROW_ID } from "../src/features/leaderboard/own/ownRowId.ts";

test("the reader's own row is found by its id, focusable and marked current", () => {
  expect(ownRowAttributes(true)).toEqual({ id: OWN_ROW_ID, tabIndex: -1, "aria-current": "true" });
});

test("another row carries none of them", () => {
  expect(ownRowAttributes(false)).toEqual({});
});
