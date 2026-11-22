import { expect, test } from "bun:test";
import { nextRoundLabel } from "../src/features/duel/clock/nextRoundLabel.ts";

test("a counting Countdown tells the time left before the next Round", () => {
  expect(
    nextRoundLabel(2, {
      kind: "counting",
      startAt: 0,
      localStartAt: 0,
      secondsLeft: 7,
      purpose: "display",
    }),
  ).toBe("Round 2 in 0:07");
});

test("a Countdown waiting for the clock offset tells the next Round is starting", () => {
  expect(nextRoundLabel(3, { kind: "awaitingOffset", startAt: 0, purpose: "display" })).toBe(
    "Round 3 starting",
  );
});

test("no Countdown tells only that the next Round comes soon", () => {
  expect(nextRoundLabel(2, { kind: "idle" })).toBe("Round 2 soon");
});
