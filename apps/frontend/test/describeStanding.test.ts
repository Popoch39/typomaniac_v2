import { expect, test } from "bun:test";
import { describeStanding } from "../src/features/ranked/standing/describeStanding.ts";

const placed = { played: 5, total: 5 };

test("a Player who never played ranked is Unranked with no Placement Duel played", () => {
  expect(describeStanding({ rank: null, placement: { played: 0, total: 5 } })).toEqual({
    headline: "Unranked",
    detail: "0 of 5 Placement Duels played",
  });
});

test("a Player in Placement is Unranked with their Placement progress", () => {
  expect(describeStanding({ rank: null, placement: { played: 3, total: 5 } })).toEqual({
    headline: "Unranked",
    detail: "3 of 5 Placement Duels played",
  });
});

test("a ranked Player is shown their Tier, their Division in Roman numerals and their LP", () => {
  expect(
    describeStanding({ rank: { tier: "gold", division: 2, lp: 45 }, placement: placed }),
  ).toEqual({ headline: "Gold II", detail: "45 LP" });
  expect(
    describeStanding({ rank: { tier: "bronze", division: 4, lp: 0 }, placement: placed }),
  ).toEqual({ headline: "Bronze IV", detail: "0 LP" });
  expect(
    describeStanding({ rank: { tier: "diamond", division: 1, lp: 99 }, placement: placed }),
  ).toEqual({ headline: "Diamond I", detail: "99 LP" });
  expect(
    describeStanding({ rank: { tier: "platinum", division: 3, lp: 7 }, placement: placed }),
  ).toEqual({ headline: "Platinum III", detail: "7 LP" });
});

test("a Master Player is shown their Tier without a Division", () => {
  expect(describeStanding({ rank: { tier: "master", lp: 340 }, placement: placed })).toEqual({
    headline: "Master",
    detail: "340 LP",
  });
});
