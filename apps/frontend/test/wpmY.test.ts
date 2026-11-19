import { expect, test } from "bun:test";
import { wpmY } from "../src/features/duel/chart/wpmY.ts";

test("the top of the scale is at the top of the chart and its bottom at the bottom", () => {
  expect(wpmY(115, { min: 85, max: 115 }, 30)).toBe(0);
  expect(wpmY(85, { min: 85, max: 115 }, 30)).toBe(30);
});

test("a WPM inside the scale sits in proportion", () => {
  expect(wpmY(100, { min: 85, max: 115 }, 30)).toBe(15);
  expect(wpmY(90, { min: 85, max: 115 }, 30)).toBe(25);
});

test("on a flat scale, every WPM sits in the middle", () => {
  expect(wpmY(60, { min: 60, max: 60 }, 40)).toBe(20);
});
