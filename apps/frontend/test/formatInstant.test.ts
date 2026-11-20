import { expect, test } from "bun:test";
import { formatInstant } from "../src/features/admin/review/formatInstant.ts";

test("an instant reads as a date and a time in the given time zone", () => {
  expect(formatInstant(Date.UTC(2026, 10, 20, 16, 30), "UTC")).toBe("20 Nov 2026, 16:30");
});
