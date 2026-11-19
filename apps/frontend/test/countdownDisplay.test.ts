import { expect, test } from "bun:test";
import { countdownDisplay } from "../src/features/duel/clock/countdownDisplay.ts";

test("each second of the Countdown is shown and said", () => {
  expect(countdownDisplay(3)).toEqual({ shown: 3, label: "Starting in 3" });
  expect(countdownDisplay(1)).toEqual({ shown: 1, label: "Starting in 1" });
});

test("nothing is shown until the clock is known", () => {
  expect(countdownDisplay(null)).toEqual({ shown: null, label: "Get ready" });
});

test("nothing is shown at 0, as the Round is starting", () => {
  expect(countdownDisplay(0)).toEqual({ shown: null, label: "Get ready" });
});
