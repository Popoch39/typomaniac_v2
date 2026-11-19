import { expect, test } from "bun:test";
import { pageKeyLabel } from "../src/features/leaderboard/page/pageKeyLabel.ts";

test("a page key is named by its page", () => {
  expect(pageKeyLabel(2, null)).toBe("Page 2");
});

test("the page key holding the reader's own Position says so", () => {
  // Positions 4 to 18 are on page 1, 19 to 33 on page 2, 34 to 48 on page 3.
  expect(pageKeyLabel(1, 4)).toBe("Page 1, your position");
  expect(pageKeyLabel(1, 18)).toBe("Page 1, your position");
  expect(pageKeyLabel(2, 19)).toBe("Page 2, your position");
  expect(pageKeyLabel(3, 37)).toBe("Page 3, your position");
  expect(pageKeyLabel(2, 37)).toBe("Page 2");
});

test("no page key holds a Position on the Podium", () => {
  expect(pageKeyLabel(1, 3)).toBe("Page 1");
  expect(pageKeyLabel(1, 1)).toBe("Page 1");
});
