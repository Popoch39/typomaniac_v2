import { expect, test } from "bun:test";
import { MIN_ACCOUNT_AGE_MS, rankedOpensAt } from "../src/index.ts";

const DAY_MS = 24 * 60 * 60 * 1000;
const created = Date.UTC(2026, 10, 1);

test("AGE-1: a GitHub or Discord account must be 7 days old before its Player may queue", () => {
  expect(MIN_ACCOUNT_AGE_MS).toBe(7 * DAY_MS);
});

test("AGE-1: a Player with one account may queue 7 days after its creation", () => {
  expect(rankedOpensAt([created])).toBe(Date.UTC(2026, 10, 8));
});

test("AGE-2: with two linked accounts, the older one opens ranked", () => {
  expect(rankedOpensAt([created + 5 * DAY_MS, created])).toBe(Date.UTC(2026, 10, 8));
  expect(rankedOpensAt([created, created + 5 * DAY_MS])).toBe(Date.UTC(2026, 10, 8));
});

test("AGE-3: an account whose creation date is not recorded is left out", () => {
  expect(rankedOpensAt([null, created])).toBe(Date.UTC(2026, 10, 8));
});

test("AGE-3: with no creation date recorded, the instant ranked opens is unknown", () => {
  expect(rankedOpensAt([null])).toBeNull();
  expect(rankedOpensAt([])).toBeNull();
});
