import { expect, test } from "bun:test";
import { rankedOpensAt } from "../src/index.ts";

test("PURE-1: reading when ranked opens never modifies the creation dates it receives", () => {
  const createdAts = [Date.UTC(2026, 10, 1), null];
  const untouched = structuredClone(createdAts);

  rankedOpensAt(createdAts);

  expect(createdAts).toEqual(untouched);
});

test("PURE-1: the same creation dates always give the same instant", () => {
  const createdAts = [Date.UTC(2026, 10, 1), Date.UTC(2025, 0, 1)];

  expect(rankedOpensAt(createdAts)).toBe(rankedOpensAt(structuredClone(createdAts)));
});

test("PURE-1: the creation dates and the instant pass through JSON unchanged", () => {
  const createdAts = [Date.UTC(2026, 10, 1), null];
  const opensAt = rankedOpensAt(createdAts);

  expect(JSON.parse(JSON.stringify(createdAts))).toEqual(createdAts);
  expect(JSON.parse(JSON.stringify(opensAt))).toBe(opensAt);
});
