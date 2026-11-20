import { expect, test } from "bun:test";
import { EdenFetchError } from "@elysia/eden";
import { reportAction } from "../src/features/duel/report/reportAction.ts";

const idle = { isPending: false, isSuccess: false, error: null };

test("at the end of a ranked Duel the Player is offered to report their Opponent", () => {
  expect(reportAction(idle)).toEqual({ label: "Report Opponent", made: false, failure: null });
});

test("while the Report is sent, the action says so and cannot be pressed again", () => {
  expect(reportAction({ ...idle, isPending: true })).toEqual({
    label: "Reporting…",
    made: false,
    failure: null,
  });
});

test("once made, the action turns into a confirmation that the Report was received", () => {
  expect(reportAction({ ...idle, isSuccess: true })).toEqual({
    label: "Report received",
    made: true,
    failure: null,
  });
});

test("a Report already made on this Duel is confirmed as received, not shown as a failure", () => {
  const error = new EdenFetchError(409, { code: "REPORT_ALREADY_MADE" });

  expect(reportAction({ ...idle, error })).toEqual({
    label: "Report received",
    made: true,
    failure: null,
  });
});

test("a Report that failed says why in a sentence and may be tried again", () => {
  const error = new EdenFetchError(429, { code: "RATE_LIMITED" });

  expect(reportAction({ ...idle, error })).toEqual({
    label: "Report Opponent",
    made: false,
    failure: "Too many attempts. Wait a moment and try again.",
  });
});

test("a Duel that cannot be reported is worded for the Report", () => {
  const error = new EdenFetchError(404, { code: "DUEL_NOT_FOUND" });

  expect(reportAction({ ...idle, error }).failure).toBe("This Duel can no longer be reported.");
});
