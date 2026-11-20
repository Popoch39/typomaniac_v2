import { expect, test } from "bun:test";
import { FIRST_SUSPENSION_MS, LONGER_SUSPENSION_MS, REPAIR_WINDOW_MS } from "../src/index.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

test("CONFIG-1: a first Suspension lasts 3 days and the next ones 14 days", () => {
  expect(FIRST_SUSPENSION_MS).toBe(3 * DAY_MS);
  expect(LONGER_SUSPENSION_MS).toBe(14 * DAY_MS);
});

test("CONFIG-2: a Suspension or a Ban voids the ranked Duels the Player won over the 14 days before it", () => {
  expect(REPAIR_WINDOW_MS).toBe(14 * DAY_MS);
});
