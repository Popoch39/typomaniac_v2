import { expect, test } from "bun:test";
import { sanctionLine } from "../src/features/admin/review/sanctionLine.ts";

const STARTED = Date.UTC(2026, 10, 1, 12, 0);
const ENDS = Date.UTC(2026, 10, 4, 12, 0);
const REVOKED = Date.UTC(2026, 10, 2, 9, 30);

test("a Sanction reads as its kind, its cause and its start", () => {
  expect(
    sanctionLine(
      { kind: "ban", cause: "review", startedAt: STARTED, endsAt: null, revokedAt: null },
      "UTC",
    ),
  ).toBe("Ban for a Review, 1 Nov 2026, 12:00");
});

test("a Suspension also reads its end, and a revoked Sanction its revocation", () => {
  expect(
    sanctionLine(
      {
        kind: "suspension",
        cause: "violation",
        startedAt: STARTED,
        endsAt: ENDS,
        revokedAt: REVOKED,
      },
      "UTC",
    ),
  ).toBe(
    "Suspension for a Violation, 1 Nov 2026, 12:00, until 4 Nov 2026, 12:00, revoked 2 Nov 2026, 09:30",
  );
});
