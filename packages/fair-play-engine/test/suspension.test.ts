import { expect, test } from "bun:test";
import { suspensionLength } from "../src/index.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

test("CONFIG-1: a Player's first Suspension lasts 3 days", () => {
  expect(suspensionLength(0)).toBe(3 * DAY_MS);
});

test("CONFIG-1: every later Suspension lasts 14 days", () => {
  expect(suspensionLength(1)).toBe(14 * DAY_MS);
  expect(suspensionLength(4)).toBe(14 * DAY_MS);
});
