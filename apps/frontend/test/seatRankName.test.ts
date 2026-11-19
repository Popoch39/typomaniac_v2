import { expect, test } from "bun:test";
import { seatRankName } from "../src/features/duel/rank/seatRankName.ts";

test("in a ranked Duel, a seat is shown by the name of its Rank, without LP", () => {
  const ranks = [
    { tier: "gold", division: 2, lp: 40 },
    { tier: "master", lp: 120 },
  ] as const;

  expect(seatRankName(ranks, 1)).toBe("Master");
  expect(seatRankName(ranks, 0)).toBe("Gold II");
});

test("in a ranked Duel, a seat without a Rank is shown as Unranked", () => {
  expect(seatRankName([{ tier: "silver", division: 4, lp: 0 }, null], 1)).toBe("Unranked");
});

test("a Custom Duel shows no Rank", () => {
  expect(seatRankName(null, 0)).toBeNull();
});
