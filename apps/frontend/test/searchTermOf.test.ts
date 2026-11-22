import { expect, test } from "bun:test";
import { searchTermOf } from "../src/features/friends/search/searchTermOf.ts";

test("a Nickname start of 2 characters or more is searched, without the spaces around it", () => {
  expect(searchTermOf("ab")).toBe("ab");
  expect(searchTermOf("  Bob_9-x ")).toBe("Bob_9-x");
});

test("nothing is searched below 2 characters", () => {
  expect(searchTermOf("")).toBeNull();
  expect(searchTermOf(" a ")).toBeNull();
});

test("a text no Nickname could start with is not searched", () => {
  expect(searchTermOf("bo b")).toBeNull();
  expect(searchTermOf("bob!")).toBeNull();
  expect(searchTermOf("a".repeat(21))).toBeNull();
});
