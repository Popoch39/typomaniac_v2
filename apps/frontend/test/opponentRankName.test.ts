import { expect, test } from "bun:test";
import { opponentRankName } from "../src/features/duel/rank/opponentRankName.ts";

test("in a ranked Duel, the Opponent is shown by the Rank of the other seat", () => {
  const ranks = [
    { tier: "gold", division: 2, lp: 40 },
    { tier: "master", lp: 120 },
  ] as const;

  expect(opponentRankName(ranks, 0)).toBe("Master");
  expect(opponentRankName(ranks, 1)).toBe("Gold II");
});

test("in a ranked Duel, an Opponent without a Rank is shown as Unranked", () => {
  expect(opponentRankName([{ tier: "silver", division: 4, lp: 0 }, null], 0)).toBe("Unranked");
});

test("a Custom Duel shows no Rank", () => {
  expect(opponentRankName(null, 0)).toBeNull();
});
