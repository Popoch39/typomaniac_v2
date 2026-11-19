import { expect, test } from "bun:test";
import { bandClock } from "../src/features/duel/clock/bandClock.ts";

test("during the Countdown, the clock shows the whole Round", () => {
  expect(bandClock({ phase: "countdown", secondsLeft: 0, round: 1, finishedRounds: 0 })).toEqual({
    text: "0:30",
    label: "0:30 left in Round 1",
    isOver: false,
  });
});

test("during a Round, the clock shows the time left in it", () => {
  expect(bandClock({ phase: "running", secondsLeft: 17, round: 2, finishedRounds: 1 })).toEqual({
    text: "0:17",
    label: "0:17 left in Round 2",
    isOver: false,
  });
});

test("before the Round is known, the clock names Round 1", () => {
  expect(
    bandClock({ phase: "countdown", secondsLeft: 0, round: null, finishedRounds: 0 }).label,
  ).toBe("0:30 left in Round 1");
});

test("once a Round is over, the clock shows 0:00, greyed, until the next Countdown", () => {
  expect(bandClock({ phase: "roundEnd", secondsLeft: 0, round: 1, finishedRounds: 1 })).toEqual({
    text: "0:00",
    label: "Round 1 over",
    isOver: true,
  });
  expect(bandClock({ phase: "finished", secondsLeft: 0, round: 2, finishedRounds: 2 })).toEqual({
    text: "0:00",
    label: "Round 2 over",
    isOver: true,
  });
});
