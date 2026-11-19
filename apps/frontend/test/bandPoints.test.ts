import { expect, test } from "bun:test";
import type { FinishedRound } from "@repo/duel-engine";
import { applyEvent, createGame, getResult } from "@repo/typing-engine";
import { bandPoints } from "../src/features/duel/points/bandPoints.ts";

const typed = (word: string) =>
  getResult(
    applyEvent(
      word
        .split("")
        .reduce(
          (game, text, index) => applyEvent(game, { type: "insert", text, at: 100 * (index + 1) }),
          applyEvent(createGame({ mode: "time", seconds: 1 }, [word]), { type: "start", at: 0 }),
        ),
      { type: "tick", at: 1000 },
    ),
  );
const fast = typed("catalogue");
const slow = typed("cat");
const finished: FinishedRound = { results: [fast, slow], outcomes: ["win", "loss"] };
const live = { own: 412, opponent: 380 };

test("during a Round, the band shows both live Points", () => {
  expect(bandPoints({ isLive: true, live, lastRound: finished, seat: 0 })).toEqual([412, 380]);
});

test("before the first Round has been played, the band shows 0 and 0", () => {
  expect(bandPoints({ isLive: false, live, lastRound: undefined, seat: 0 })).toEqual([0, 0]);
});

test("between Rounds, the band keeps the Points of the last Round, the Participant's own first", () => {
  const [fastPoints, slowPoints] = bandPoints({
    isLive: false,
    live,
    lastRound: finished,
    seat: 0,
  });

  expect(fastPoints).toBeGreaterThan(slowPoints);
  expect(bandPoints({ isLive: false, live, lastRound: finished, seat: 1 })).toEqual([
    slowPoints,
    fastPoints,
  ]);
});
