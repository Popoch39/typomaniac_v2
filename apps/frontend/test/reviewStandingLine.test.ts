import { expect, test } from "bun:test";
import { reviewStandingLine } from "../src/features/admin/review/reviewStandingLine.ts";

test("a ranked Player's Standing reads with their Rank, LP, MMR and ranked Duels played", () => {
  expect(
    reviewStandingLine({ mmr: 1384, duelsPlayed: 40, rank: { tier: "gold", division: 3, lp: 50 } }),
  ).toBe("Gold III · 50 LP · MMR 1384 · 40 ranked Duels");
});

test("an Unranked Player's Standing reads without a Rank", () => {
  expect(reviewStandingLine({ mmr: 1200, duelsPlayed: 1, rank: null })).toBe(
    "Unranked · MMR 1200 · 1 ranked Duel",
  );
});
