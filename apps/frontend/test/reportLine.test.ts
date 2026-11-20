import { expect, test } from "bun:test";
import { reportLine } from "../src/features/admin/review/reportLine.ts";

const reportedAt = Date.UTC(2026, 10, 20, 16, 5);

test("a Report in a Review names who made it, the Duel it concerns and when", () => {
  expect(
    reportLine(
      { duelId: "0f8e2c1a-1111-4222-8333-444455556666", reporterNickname: "ada", reportedAt },
      "UTC",
    ),
  ).toBe("By ada, on Duel 0f8e2c1a, 20 Nov 2026, 16:05");
});

test("a Report by a Player without a Nickname names them as a Player", () => {
  expect(
    reportLine(
      { duelId: "0f8e2c1a-1111-4222-8333-444455556666", reporterNickname: null, reportedAt },
      "UTC",
    ),
  ).toBe("By a Player, on Duel 0f8e2c1a, 20 Nov 2026, 16:05");
});
