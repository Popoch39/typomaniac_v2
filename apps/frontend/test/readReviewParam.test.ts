import { expect, test } from "bun:test";
import { readReviewParam } from "../src/features/admin/review/readReviewParam.ts";

test("a Review id is read as it is", () => {
  expect(readReviewParam("0b7c1c1e-4a7e-4f4c-9d65-2a0f7f6d2e11")).toBe(
    "0b7c1c1e-4a7e-4f4c-9d65-2a0f7f6d2e11",
  );
});

test("anything but a Review id opens no Review", () => {
  for (const value of [undefined, null, "", "not-a-review", 12, {}, ["x"]])
    expect(readReviewParam(value)).toBeUndefined();
});
