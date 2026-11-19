import { expect, test } from "bun:test";
import type { RankedEnd } from "@repo/duel-engine";
import type { Rank } from "@repo/ranked-engine";
import { tierPromotion } from "../src/features/duel/rank/tierPromotion.ts";

const placed = { played: 5, total: 5 };
const promotedTo = (rank: Rank): RankedEnd => ({
  lpDelta: 22,
  rankChange: "promoted",
  rank,
  placement: placed,
});

test("a promotion from Bronze I to Silver IV is the Silver Tier promotion, titled by the Rank name", () => {
  expect(tierPromotion(promotedTo({ tier: "silver", division: 4, lp: 12 }))).toEqual({
    tier: "silver",
    oldOrnament: { tier: "bronze", division: 1 },
    newOrnament: { tier: "silver", division: 4 },
    title: { kind: "name", name: "Silver IV" },
    line: "Promoted from Bronze I",
    announcement: "Promoted to Silver IV",
  });
});

test("a promotion from Silver I to Gold IV is the Gold Tier promotion, titled by the Tier name in keys over the Rank name", () => {
  expect(tierPromotion(promotedTo({ tier: "gold", division: 4, lp: 3 }))).toEqual({
    tier: "gold",
    oldOrnament: { tier: "silver", division: 1 },
    newOrnament: { tier: "gold", division: 4 },
    title: { kind: "keys", letters: ["G", "o", "l", "d"], name: "Gold IV" },
    line: "Promoted from Silver I",
    announcement: "Promoted to Gold IV",
  });
});

test("a promotion from Gold I to Platinum IV is the Platinum Tier promotion", () => {
  expect(tierPromotion(promotedTo({ tier: "platinum", division: 4, lp: 0 }))).toEqual({
    tier: "platinum",
    oldOrnament: { tier: "gold", division: 1 },
    newOrnament: { tier: "platinum", division: 4 },
    title: {
      kind: "keys",
      letters: ["P", "l", "a", "t", "i", "n", "u", "m"],
      name: "Platinum IV",
    },
    line: "Promoted from Gold I",
    announcement: "Promoted to Platinum IV",
  });
});

test("a promotion from Platinum I to Diamond IV is the Diamond Tier promotion", () => {
  expect(tierPromotion(promotedTo({ tier: "diamond", division: 4, lp: 20 }))).toEqual({
    tier: "diamond",
    oldOrnament: { tier: "platinum", division: 1 },
    newOrnament: { tier: "diamond", division: 4 },
    title: { kind: "keys", letters: ["D", "i", "a", "m", "o", "n", "d"], name: "Diamond IV" },
    line: "Promoted from Platinum I",
    announcement: "Promoted to Diamond IV",
  });
});

test("a promotion from Diamond I to Master is the Master Tier promotion, whose Ornament has no Division", () => {
  expect(tierPromotion(promotedTo({ tier: "master", lp: 8 }))).toEqual({
    tier: "master",
    oldOrnament: { tier: "diamond", division: 1 },
    newOrnament: { tier: "master", division: null },
    title: { kind: "keys", letters: ["M", "a", "s", "t", "e", "r"], name: "Master" },
    line: "Promoted from Diamond I",
    announcement: "Promoted to Master",
  });
});

test("a Promotion inside a Tier is no Tier promotion", () => {
  expect(tierPromotion(promotedTo({ tier: "gold", division: 3, lp: 5 }))).toBeNull();
  expect(tierPromotion(promotedTo({ tier: "bronze", division: 3, lp: 5 }))).toBeNull();
});

test("a first Rank, a demotion and a Duel that moved no Division are no Tier promotion", () => {
  const silverFour = { tier: "silver", division: 4, lp: 40 } as const;
  const ended = (rankChange: RankedEnd["rankChange"]): RankedEnd => ({
    ...promotedTo(silverFour),
    rankChange,
  });

  expect(tierPromotion(ended("placed"))).toBeNull();
  expect(tierPromotion(ended("demoted"))).toBeNull();
  expect(tierPromotion(ended("none"))).toBeNull();
});

test("an Unranked Participant has no Tier promotion", () => {
  expect(
    tierPromotion({
      lpDelta: 0,
      rankChange: "none",
      rank: null,
      placement: { played: 2, total: 5 },
    }),
  ).toBeNull();
});
