import { expect, test } from "bun:test";
import {
  isOrnamentUnlocked,
  isTierChoice,
  TIERS,
  tierAtLadderIndex,
  wornOrnament,
} from "../src/index.ts";

test("ORNAMENT-1: Auto wears the Unranked plate while Unranked", () => {
  expect(wornOrnament("auto", null)).toEqual({ tier: "unranked", division: null });
});

test("ORNAMENT-1: Auto wears the Rank's Tier and Division", () => {
  expect(wornOrnament("auto", { tier: "silver", division: 2, lp: 45 })).toEqual({
    tier: "silver",
    division: 2,
  });
});

test("ORNAMENT-1: Auto in Master wears Master, without a Division", () => {
  expect(wornOrnament("auto", { tier: "master", lp: 340 })).toEqual({
    tier: "master",
    division: null,
  });
});

test("ORNAMENT-1: None wears no Ornament, whatever the Rank", () => {
  expect(wornOrnament("none", null)).toBeNull();
  expect(wornOrnament("none", { tier: "gold", division: 1, lp: 0 })).toBeNull();
});

test("ORNAMENT-1: Unranked wears the plate, even for a ranked Player", () => {
  expect(wornOrnament("unranked", { tier: "diamond", division: 3, lp: 10 })).toEqual({
    tier: "unranked",
    division: null,
  });
});

test("ORNAMENT-1: a pinned Tier other than the current one draws its Tier without a Division", () => {
  expect(wornOrnament("gold", { tier: "platinum", division: 4, lp: 0 })).toEqual({
    tier: "gold",
    division: null,
  });
  expect(wornOrnament("gold", null)).toEqual({ tier: "gold", division: null });
});

test("ORNAMENT-1: a pinned Tier that is the current one wears the Rank's Division", () => {
  expect(wornOrnament("silver", { tier: "silver", division: 1, lp: 80 })).toEqual({
    tier: "silver",
    division: 1,
  });
});

test("ORNAMENT-2: Auto, None and Unranked are open to every Player, even without a Peak Tier", () => {
  expect(isOrnamentUnlocked("auto", null)).toBe(true);
  expect(isOrnamentUnlocked("none", null)).toBe(true);
  expect(isOrnamentUnlocked("unranked", null)).toBe(true);
});

test("ORNAMENT-2: a Tier is unlocked up to the Peak Tier and locked above it", () => {
  expect(isOrnamentUnlocked("bronze", "gold")).toBe(true);
  expect(isOrnamentUnlocked("gold", "gold")).toBe(true);
  expect(isOrnamentUnlocked("platinum", "gold")).toBe(false);
  expect(isOrnamentUnlocked("master", "diamond")).toBe(false);
  expect(isOrnamentUnlocked("master", "master")).toBe(true);
});

test("ORNAMENT-2: no Tier is unlocked without a Peak Tier", () => {
  expect(isOrnamentUnlocked("bronze", null)).toBe(false);
});

test("ORNAMENT-3: the Peak Tier is the Tier of the highest ladder index reached", () => {
  expect(tierAtLadderIndex(0)).toBe("bronze");
  expect(tierAtLadderIndex(3)).toBe("bronze");
  expect(tierAtLadderIndex(4)).toBe("silver");
  expect(tierAtLadderIndex(19)).toBe("diamond");
  expect(tierAtLadderIndex(20)).toBe("master");
});

test("the six Tiers run from Bronze up to Master", () => {
  expect(TIERS).toEqual(["bronze", "silver", "gold", "platinum", "diamond", "master"]);
});

test("a Tier choice pins a Tier; Auto, None, Unranked and anything else do not", () => {
  expect(isTierChoice("gold")).toBe(true);
  expect(isTierChoice("master")).toBe(true);
  expect(isTierChoice("auto")).toBe(false);
  expect(isTierChoice("unranked")).toBe(false);
  expect(isTierChoice(1)).toBe(false);
});
