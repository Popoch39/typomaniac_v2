import { expect, test } from "bun:test";
import { rankedEndBlock } from "../src/features/duel/rank/rankedEndBlock.ts";

const placed = { played: 5, total: 5 };

test("LP won show as a gain, with the Rank reached and the climb toward the next Division", () => {
  expect(
    rankedEndBlock({
      lpDelta: 18,
      rankChange: "none",
      rank: { tier: "gold", division: 2, lp: 80 },
      placement: placed,
    }),
  ).toEqual({
    lpDelta: { amount: "+18", tone: "gain" },
    standing: "Gold II · 80 LP",
    isAnnounced: false,
    progress: { lp: 80, next: "Gold I" },
    placement: null,
  });
});

test("LP lost show as a loss, and LP that did not move, as after a drawn Duel, as neither", () => {
  const goldTwo = { tier: "gold", division: 2 } as const;

  expect(
    rankedEndBlock({
      lpDelta: -12,
      rankChange: "none",
      rank: { ...goldTwo, lp: 50 },
      placement: placed,
    }).lpDelta,
  ).toEqual({ amount: "-12", tone: "loss" });
  expect(
    rankedEndBlock({
      lpDelta: 0,
      rankChange: "none",
      rank: { ...goldTwo, lp: 50 },
      placement: placed,
    }).lpDelta,
  ).toEqual({ amount: "±0", tone: "none" });
});

test("a promotion and a demotion are announced with the Rank they lead to", () => {
  const promoted = rankedEndBlock({
    lpDelta: 21,
    rankChange: "promoted",
    rank: { tier: "gold", division: 1, lp: 4 },
    placement: placed,
  });
  const demoted = rankedEndBlock({
    lpDelta: -23,
    rankChange: "demoted",
    rank: { tier: "gold", division: 3, lp: 75 },
    placement: placed,
  });

  expect(promoted.standing).toBe("Promoted to Gold I · 4 LP");
  expect(promoted.isAnnounced).toBe(true);
  expect(demoted.standing).toBe("Demoted to Gold III · 75 LP");
  expect(demoted.isAnnounced).toBe(true);
});

test("a first Rank is announced, with no LP won or lost to reach it", () => {
  expect(
    rankedEndBlock({
      lpDelta: 0,
      rankChange: "placed",
      rank: { tier: "silver", division: 1, lp: 0 },
      placement: placed,
    }),
  ).toEqual({
    lpDelta: null,
    standing: "Placed in Silver I · 0 LP",
    isAnnounced: true,
    progress: { lp: 0, next: "Gold IV" },
    placement: null,
  });
});

test("a Player in Placement sees their Placement progress, with no LP and no climb", () => {
  expect(
    rankedEndBlock({
      lpDelta: 0,
      rankChange: "none",
      rank: null,
      placement: { played: 3, total: 5 },
    }),
  ).toEqual({
    lpDelta: null,
    standing: "Placement",
    isAnnounced: false,
    progress: null,
    placement: "3 of 5 Placement Duels played",
  });
});

test("a Master has no Division above to climb toward", () => {
  expect(
    rankedEndBlock({
      lpDelta: 15,
      rankChange: "none",
      rank: { tier: "master", lp: 140 },
      placement: placed,
    }).progress,
  ).toBeNull();
});
