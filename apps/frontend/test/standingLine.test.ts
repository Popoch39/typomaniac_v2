import { expect, test } from "bun:test";
import { standingLine } from "../src/features/ranked/standing/standingLine.ts";

const placed = { played: 5, total: 5 };

test("a ranked Player's line is their Rank and their LP", () => {
  expect(standingLine({ rank: { tier: "platinum", division: 2, lp: 64 }, placement: placed })).toBe(
    "Platinum II · 64 LP",
  );
  expect(standingLine({ rank: { tier: "master", lp: 340 }, placement: placed })).toBe(
    "Master · 340 LP",
  );
});

test("an Unranked Player's line is their Placement progress", () => {
  expect(standingLine({ rank: null, placement: { played: 3, total: 5 } })).toBe("Placement 3/5");
});
