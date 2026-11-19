import { expect, test } from "bun:test";
import { formatClock } from "../src/shared/lib/formatClock.ts";

test("a clock shows minutes and two-digit seconds", () => {
  expect(formatClock(0)).toBe("0:00");
  expect(formatClock(7)).toBe("0:07");
  expect(formatClock(63)).toBe("1:03");
  expect(formatClock(600)).toBe("10:00");
});
