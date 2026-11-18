import { expect, test } from "bun:test";
import { eventClockShift } from "../src/features/duel/clock/eventClockShift.ts";

test("a Game the Participant started themselves is stamped on their own clock, whatever its offset", () => {
  expect(eventClockShift({ gameStartedAt: 1000.25, startAt: 5000, clockOffset: 4000 })).toBe(0);
  expect(eventClockShift({ gameStartedAt: 1000.25, startAt: 5000, clockOffset: null })).toBe(0);
});

test("a Game the server started at the announced Start is stamped in server time, through the clock offset", () => {
  expect(eventClockShift({ gameStartedAt: 5000, startAt: 5000, clockOffset: 4000 })).toBe(4000);
  expect(eventClockShift({ gameStartedAt: 5000, startAt: 5000, clockOffset: -2000 })).toBe(-2000);
});

test("a Game the server started cannot be stamped until the clock offset is estimated", () => {
  expect(eventClockShift({ gameStartedAt: 5000, startAt: 5000, clockOffset: null })).toBeNull();
});
