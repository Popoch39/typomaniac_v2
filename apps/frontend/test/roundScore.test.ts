import { expect, test } from "bun:test";
import type { FinishedRound } from "@repo/duel-engine";
import { applyEvent, createGame, getResult } from "@repo/typing-engine";
import { ownRoundScore } from "../src/features/duel/round/roundScore.ts";
import { summariseRound } from "../src/features/duel/round/summariseRound.ts";

const game = applyEvent(createGame({ mode: "time", seconds: 1 }, ["cat"]), {
  type: "start",
  at: 0,
});
const idle = getResult(applyEvent(game, { type: "tick", at: 1000 }));
const typed = getResult(
  applyEvent(applyEvent(game, { type: "insert", at: 500, text: "cat" }), {
    type: "tick",
    at: 1000,
  }),
);

const wonBySeat0: FinishedRound = {
  results: [typed, idle],
  multipliers: [1, 1],
  outcomes: ["win", "loss"],
};
const wonBySeat1: FinishedRound = {
  results: [idle, typed],
  multipliers: [1, 1],
  outcomes: ["loss", "win"],
};
const drawn: FinishedRound = {
  results: [idle, idle],
  multipliers: [1, 1],
  outcomes: ["draw", "draw"],
};

test("the Round score is 0-0 before any Round has ended", () => {
  expect(ownRoundScore([], 0)).toEqual({ own: 0, opponent: 0 });
});

test("the Round score is read from the Participant's own seat", () => {
  const rounds = [wonBySeat0, wonBySeat0, wonBySeat1];

  expect(ownRoundScore(rounds, 0)).toEqual({ own: 2, opponent: 1 });
  expect(ownRoundScore(rounds, 1)).toEqual({ own: 1, opponent: 2 });
});

test("a drawn Round adds to neither side of the Round score", () => {
  expect(ownRoundScore([drawn, wonBySeat1, drawn], 0)).toEqual({ own: 0, opponent: 1 });
});

const participants = [
  { seat: 0, name: "ada", avatarUrl: null, ornament: null, connected: true },
  { seat: 1, name: "Guest 4821", avatarUrl: null, ornament: null, connected: false },
] as const;

test("a finished Round is shown with the Participant's own Outcome, and both Results with their Points, their own first", () => {
  expect(summariseRound(wonBySeat0, { number: 2, seat: 1, participants })).toEqual({
    number: 2,
    outcome: "loss",
    sides: [
      { seat: 1, name: "Guest 4821", result: idle, multiplier: 1, points: 0 },
      { seat: 0, name: "ada", result: typed, multiplier: 1, points: 360 },
    ],
  });
});

test("each side shows the Points that decided the Round, the winner's the higher", () => {
  const fasterButSloppier = { ...typed, wpm: 100, accuracy: 93 };
  const slowerButCleaner = { ...typed, wpm: 90, accuracy: 99 };
  const round: FinishedRound = {
    results: [fasterButSloppier, slowerButCleaner],
    multipliers: [1, 1],
    outcomes: ["loss", "win"],
  };

  const summary = summariseRound(round, { number: 1, seat: 0, participants });

  expect(summary.sides.map((side) => side.points)).toEqual([865, 882]);
});

test("a drawn Round shows equal Points on both sides", () => {
  const summary = summariseRound(drawn, { number: 1, seat: 0, participants });

  expect(summary.sides.map((side) => side.points)).toEqual([0, 0]);
});

test("a Participant whose name is unknown is shown without one", () => {
  const summary = summariseRound(drawn, { number: 1, seat: 0, participants: [] });

  expect(summary.sides.map((side) => side.name)).toEqual(["", ""]);
});
