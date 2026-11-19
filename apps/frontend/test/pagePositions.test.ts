import { expect, test } from "bun:test";
import { pagePositions } from "../src/features/leaderboard/page/pagePositions.ts";

test("a page names the first and the last Position it holds", () => {
  expect(pagePositions([{ position: 4 }, { position: 5 }, { position: 18 }])).toBe(
    "positions 4 to 18",
  );
});

test("an empty page names no Position", () => {
  expect(pagePositions([])).toBeNull();
});
