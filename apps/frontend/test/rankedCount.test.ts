import { expect, test } from "bun:test";
import { rankedCount } from "../src/features/leaderboard/page/rankedCount.ts";

test("the count of ranked Players agrees with its number", () => {
  expect(rankedCount(1)).toBe("1 Player");
  expect(rankedCount(0)).toBe("0 Players");
  expect(rankedCount(1284)).toBe("1284 Players");
});
