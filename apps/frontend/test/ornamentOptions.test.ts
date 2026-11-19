import { expect, test } from "bun:test";
import { ornamentOptions } from "../src/features/ornament/picker/ornamentOptions.ts";

test("every choice is offered, in order, from Auto to Master", () => {
  expect(ornamentOptions(null, null).map(({ choice }) => choice)).toEqual([
    "auto",
    "none",
    "unranked",
    "bronze",
    "silver",
    "gold",
    "platinum",
    "diamond",
    "master",
  ]);
});

test("the Tiers up to the Peak Tier are open and the ones above it are locked with their unlock hint", () => {
  const options = ornamentOptions("gold", { tier: "silver", division: 2, lp: 10 });

  expect(options.map(({ label, lockedHint }) => [label, lockedHint])).toEqual([
    ["Auto", null],
    ["None", null],
    ["Unranked", null],
    ["Bronze", null],
    ["Silver", null],
    ["Gold", null],
    ["Platinum", "Reach Platinum to unlock"],
    ["Diamond", "Reach Diamond to unlock"],
    ["Master", "Reach Master to unlock"],
  ]);
});

test("without a Peak Tier, every Tier is locked", () => {
  const locked = ornamentOptions(null, null).filter(({ lockedHint }) => lockedHint !== null);

  expect(locked.map(({ choice }) => choice)).toEqual([
    "bronze",
    "silver",
    "gold",
    "platinum",
    "diamond",
    "master",
  ]);
});

test("each option previews the Ornament it would put on, Auto with the Division of the Rank", () => {
  const previews = ornamentOptions("gold", { tier: "silver", division: 2, lp: 10 }).map(
    ({ preview }) => preview,
  );

  expect(previews.slice(0, 5)).toEqual([
    { tier: "silver", division: 2 },
    null,
    { tier: "unranked", division: null },
    { tier: "bronze", division: null },
    { tier: "silver", division: null },
  ]);
});
