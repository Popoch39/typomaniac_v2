import { expect, test } from "bun:test";
import { pageToReplace } from "../src/features/leaderboard/page/pageToReplace.ts";

test("the URL is left alone when the served page is the requested one", () => {
  expect(pageToReplace(3, 3)).toBeNull();
});

test("the URL is replaced by the served page when the requested one is past the last", () => {
  expect(pageToReplace(9, 4)).toBe(4);
  expect(pageToReplace(2, 1)).toBe(1);
});
