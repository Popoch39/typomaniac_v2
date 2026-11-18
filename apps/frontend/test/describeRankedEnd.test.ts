import { expect, test } from "bun:test";
import { describeRankedEnd } from "../src/features/ranked/standing/describeRankedEnd.ts";

const placed = { played: 5, total: 5 };
const goldTwo = { tier: "gold", division: 2 } as const;

test("a Player in Placement is shown their Placement progress, and no LP", () => {
  expect(
    describeRankedEnd({
      lpDelta: 0,
      rankChange: "none",
      rank: null,
      placement: { played: 3, total: 5 },
    }),
  ).toEqual({ headline: "Placement", lpChange: null, detail: "3 of 5 Placement Duels played" });
});

test("a Player finishing their Placement is shown their first Rank", () => {
  expect(
    describeRankedEnd({
      lpDelta: 0,
      rankChange: "placed",
      rank: { tier: "silver", division: 1, lp: 0 },
      placement: placed,
    }),
  ).toEqual({ headline: "Placed in Silver I", lpChange: null, detail: "0 LP" });
});

test("a ranked Player is shown the LP won or lost, signed, with their Rank", () => {
  expect(
    describeRankedEnd({
      lpDelta: 18,
      rankChange: "none",
      rank: { ...goldTwo, lp: 63 },
      placement: placed,
    }),
  ).toEqual({ headline: "Gold II", lpChange: "+18 LP", detail: "63 LP" });
  expect(
    describeRankedEnd({
      lpDelta: -22,
      rankChange: "none",
      rank: { ...goldTwo, lp: 23 },
      placement: placed,
    }),
  ).toEqual({ headline: "Gold II", lpChange: "-22 LP", detail: "23 LP" });
});

test("a ranked Player whose LP did not move, as after a drawn Duel, is told so", () => {
  expect(
    describeRankedEnd({
      lpDelta: 0,
      rankChange: "none",
      rank: { ...goldTwo, lp: 45 },
      placement: placed,
    }),
  ).toEqual({ headline: "Gold II", lpChange: "No LP won or lost", detail: "45 LP" });
});

test("a promotion and a demotion are named with the Rank they lead to", () => {
  expect(
    describeRankedEnd({
      lpDelta: 23,
      rankChange: "promoted",
      rank: { tier: "master", lp: 13 },
      placement: placed,
    }),
  ).toEqual({ headline: "Promoted to Master", lpChange: "+23 LP", detail: "13 LP" });
  expect(
    describeRankedEnd({
      lpDelta: -23,
      rankChange: "demoted",
      rank: { tier: "gold", division: 3, lp: 75 },
      placement: placed,
    }),
  ).toEqual({ headline: "Demoted to Gold III", lpChange: "-23 LP", detail: "75 LP" });
});
