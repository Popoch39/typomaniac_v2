import { expect, test } from "bun:test";
import { isOrnamentUnlocked, wornOrnament } from "../src/index.ts";

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

test("ORNAMENT-1: a pinned Tier draws its Tier without a Division, even when it is the current Tier", () => {
  expect(wornOrnament("gold", { tier: "platinum", division: 4, lp: 0 })).toEqual({
    tier: "gold",
    division: null,
  });
  expect(wornOrnament("silver", { tier: "silver", division: 1, lp: 80 })).toEqual({
    tier: "silver",
    division: null,
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
