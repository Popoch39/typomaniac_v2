import { expect, test } from "bun:test";
import { readPageParam } from "../src/features/leaderboard/page/readPageParam.ts";

test("a whole page number of at least 1 is read as it is", () => {
  expect(readPageParam(1)).toBe(1);
  expect(readPageParam(7)).toBe(7);
  expect(readPageParam("12")).toBe(12);
});

test("a missing page is the first one", () => {
  expect(readPageParam(undefined)).toBe(1);
});

test("anything that is not a whole page number of at least 1 is the first page", () => {
  for (const value of [
    0,
    -3,
    2.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    "",
    "two",
    "2.5",
    "-1",
    "0x2",
    " 3",
    null,
    true,
    {},
    [2],
  ])
    expect(readPageParam(value)).toBe(1);
});
