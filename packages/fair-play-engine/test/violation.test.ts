import { expect, test } from "bun:test";
import { nextViolationSanction } from "../src/index.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

test("VIOLATION-1: a Player's first sanctioned Violation voids its Duel", () => {
  expect(nextViolationSanction(0)).toEqual({ kind: "voided_duel" });
});

test("VIOLATION-1: a second one suspends the Player for 3 days", () => {
  expect(nextViolationSanction(1)).toEqual({ kind: "suspension", lengthMs: 3 * DAY_MS });
});

test("VIOLATION-1: a third one suspends the Player for 14 days", () => {
  expect(nextViolationSanction(2)).toEqual({ kind: "suspension", lengthMs: 14 * DAY_MS });
});

test("VIOLATION-1: a fourth one, and any after it, bans the Player", () => {
  expect(nextViolationSanction(3)).toEqual({ kind: "ban" });
  expect(nextViolationSanction(7)).toEqual({ kind: "ban" });
});
