import { expect, test } from "bun:test";
import { countdownDisplay } from "../src/features/duel/clock/countdownDisplay.ts";

const counting = (secondsLeft: number) =>
  ({ kind: "counting", startAt: 0, localStartAt: 0, secondsLeft, purpose: "start" }) as const;

test("each second of the Countdown is shown and said", () => {
  expect(countdownDisplay(counting(3))).toEqual({ shown: 3, label: "Starting in 3" });
  expect(countdownDisplay(counting(1))).toEqual({ shown: 1, label: "Starting in 1" });
});

test("nothing is shown until the clock is known, as the Round is about to start", () => {
  expect(countdownDisplay({ kind: "awaitingOffset", startAt: 0, purpose: "start" })).toEqual({
    shown: null,
    label: "Get ready",
  });
});

test("nothing is shown at 0, as the Round is starting", () => {
  expect(countdownDisplay(counting(0))).toEqual({ shown: null, label: "Get ready" });
});
