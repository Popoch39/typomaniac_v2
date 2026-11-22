import { expect, test } from "bun:test";
import { challengeTimeLeft } from "../src/features/challenge/clock/challengeClock.ts";

// Told at 50_000 on the client's clock that a minute is left to answer.
const window = { answerWithinMs: 60_000, receivedAt: 50_000 };

test("the time left to answer starts from what the server said was left, as a clock", () => {
  expect(challengeTimeLeft(window, 50_000)).toEqual({ label: "1:00", share: 1 });
});

test("the time left to answer shrinks with the client's clock, a second showing until it is spent", () => {
  expect(challengeTimeLeft(window, 50_001).label).toBe("1:00");
  expect(challengeTimeLeft(window, 51_000)).toEqual({ label: "0:59", share: 59 / 60 });
  expect(challengeTimeLeft(window, 109_001)).toEqual({ label: "0:01", share: 1 / 60 });
  expect(challengeTimeLeft(window, 110_000)).toEqual({ label: "0:00", share: 0 });
});

test("the time left to answer is never negative", () => {
  expect(challengeTimeLeft(window, 200_000)).toEqual({ label: "0:00", share: 0 });
});

test("a Challenge heard with no time left drains nothing", () => {
  expect(challengeTimeLeft({ answerWithinMs: 0, receivedAt: 0 }, 0)).toEqual({
    label: "0:00",
    share: 0,
  });
});
