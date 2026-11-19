import { expect, test } from "bun:test";
import { paginationWindow } from "../src/features/leaderboard/page/paginationWindow.ts";

test("a single page shows its own number only", () => {
  expect(paginationWindow(1, 1)).toEqual([1]);
});

test("a few pages show every number", () => {
  expect(paginationWindow(1, 5)).toEqual([1, 2, 3, 4, 5]);
  expect(paginationWindow(3, 5)).toEqual([1, 2, 3, 4, 5]);
});

test("on the first page, the next two pages, an ellipsis and the last page", () => {
  expect(paginationWindow(1, 11)).toEqual([1, 2, 3, "ellipsis", 11]);
});

test("in the middle, the first page, the neighbours on each side and the last page, between ellipses", () => {
  expect(paginationWindow(6, 11)).toEqual([1, "ellipsis", 5, 6, 7, "ellipsis", 11]);
});

test("an ellipsis never stands for a single page: that page is shown instead", () => {
  expect(paginationWindow(4, 11)).toEqual([1, 2, 3, 4, 5, "ellipsis", 11]);
  expect(paginationWindow(8, 11)).toEqual([1, "ellipsis", 7, 8, 9, 10, 11]);
});

test("on the last page, the first page, an ellipsis and the two pages before", () => {
  expect(paginationWindow(11, 11)).toEqual([1, "ellipsis", 9, 10, 11]);
});
