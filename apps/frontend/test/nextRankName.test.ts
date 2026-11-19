import { expect, test } from "bun:test";
import { nextRankName } from "../src/features/ranked/standing/nextRankName.ts";

test("a Division promotes to the one above it in the same Tier", () => {
  expect(nextRankName({ tier: "platinum", division: 2, lp: 64 })).toBe("Platinum I");
  expect(nextRankName({ tier: "bronze", division: 4, lp: 0 })).toBe("Bronze III");
});

test("Division I promotes to Division IV of the next Tier", () => {
  expect(nextRankName({ tier: "gold", division: 1, lp: 10 })).toBe("Platinum IV");
});

test("Diamond I promotes to Master", () => {
  expect(nextRankName({ tier: "diamond", division: 1, lp: 99 })).toBe("Master");
});

test("Master has nothing above it", () => {
  expect(nextRankName({ tier: "master", lp: 340 })).toBeNull();
});
