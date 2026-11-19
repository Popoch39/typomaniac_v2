import { expect, test } from "bun:test";
import { chipArt, fullArt } from "../src/features/ornament/art/ornamentArt.ts";
import { ornamentDrawing } from "../src/features/ornament/art/ornamentDrawing.ts";

const { frame, neutralPlate, litPlate, pips } = fullArt.gold;
const [first, second, third, fourth] = pips;

test("the Unranked plate is drawn alone, without Tier colour, pips or numeral", () => {
  expect(ornamentDrawing({ tier: "unranked", division: null }, "full")).toEqual({
    tierClassName: null,
    layers: fullArt.unranked,
    numeral: null,
  });
});

test("a Division lights one pip per step climbed and writes its numeral in ink on the key plate", () => {
  expect(ornamentDrawing({ tier: "gold", division: 2 }, "full")).toEqual({
    tierClassName: "ornament-gold",
    layers: [...frame, ...neutralPlate, ...first.lit, ...second.lit, ...third.lit, ...fourth.unlit],
    numeral: { text: "II", className: "ornament-ink" },
  });
});

test("Division I lights every pip and the plate, its numeral written in the key's ink", () => {
  expect(ornamentDrawing({ tier: "gold", division: 1 }, "full")).toEqual({
    tierClassName: "ornament-gold",
    layers: [...frame, ...litPlate, ...first.lit, ...second.lit, ...third.lit, ...fourth.lit],
    numeral: { text: "I", className: "ornament-on-key" },
  });
});

test("a pinned Tier is drawn with every pip unlit and no numeral", () => {
  expect(ornamentDrawing({ tier: "gold", division: null }, "full")).toEqual({
    tierClassName: "ornament-gold",
    layers: [
      ...frame,
      ...neutralPlate,
      ...first.unlit,
      ...second.unlit,
      ...third.unlit,
      ...fourth.unlit,
    ],
    numeral: null,
  });
});

test("Master is drawn with its star and no Division", () => {
  expect(ornamentDrawing({ tier: "master", division: null }, "full")).toEqual({
    tierClassName: "ornament-master",
    layers: fullArt.master,
    numeral: null,
  });
});

test("the chip shows the Division by its lit pips only", () => {
  expect(ornamentDrawing({ tier: "silver", division: 3 }, "chip")).toEqual({
    tierClassName: "ornament-silver",
    layers: [...chipArt.silver.frame, ...chipArt.silver.litPips.slice(0, 2)],
    numeral: null,
  });
  expect(ornamentDrawing({ tier: "silver", division: null }, "chip")).toEqual({
    tierClassName: "ornament-silver",
    layers: chipArt.silver.frame,
    numeral: null,
  });
});

test("the Unranked and Master chips are their frames alone", () => {
  expect(ornamentDrawing({ tier: "unranked", division: null }, "chip").layers).toEqual(
    chipArt.unranked,
  );
  expect(ornamentDrawing({ tier: "master", division: null }, "chip").layers).toEqual(
    chipArt.master,
  );
});
