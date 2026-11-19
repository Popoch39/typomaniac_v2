import { expect, test } from "bun:test";
import { pageToReplace } from "../src/features/leaderboard/page/pageToReplace.ts";

test("the URL is left alone when the served page is the requested one", () => {
  expect(pageToReplace(3, { page: 3, isPlaceholder: false })).toBeNull();
});

test("the URL is replaced by the served page when the requested one is past the last", () => {
  expect(pageToReplace(9, { page: 4, isPlaceholder: false })).toBe(4);
  expect(pageToReplace(2, { page: 1, isPlaceholder: false })).toBe(1);
});

test("the URL is left alone while the previous page stands in for the requested one", () => {
  expect(pageToReplace(5, { page: 4, isPlaceholder: true })).toBeNull();
});
