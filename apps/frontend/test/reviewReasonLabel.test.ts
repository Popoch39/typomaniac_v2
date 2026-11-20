import { expect, test } from "bun:test";
import { reviewReasonLabel } from "../src/features/admin/review/reviewReasonLabel.ts";

test("each reason a Review was opened for reads as a sentence", () => {
  expect(reviewReasonLabel("suspicion")).toBe("Suspicion past the threshold");
  expect(reviewReasonLabel("master")).toBe("Reached Master");
  expect(reviewReasonLabel("podium")).toBe("Reached the Podium");
});
