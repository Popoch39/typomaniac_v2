import { expect, test } from "bun:test";
import type { FinishedRound } from "@repo/duel-engine";
import { applyEvent, createGame, getResult } from "@repo/typing-engine";
import { roundPips } from "../src/features/duel/round/roundPips.ts";

const idle = getResult(
  applyEvent(
    applyEvent(createGame({ mode: "time", seconds: 1 }, ["cat"]), { type: "start", at: 0 }),
    { type: "tick", at: 1000 },
  ),
);

const wonBySeat0: FinishedRound = { results: [idle, idle], outcomes: ["win", "loss"] };
const wonBySeat1: FinishedRound = { results: [idle, idle], outcomes: ["loss", "win"] };
const drawn: FinishedRound = { results: [idle, idle], outcomes: ["draw", "draw"] };

const names = { self: "kaelen", opponent: "vexwyrm" };

test("before Round 1, the first pip is the Round being played and the others are upcoming", () => {
  expect(roundPips([], 1, 0, names).pips).toEqual([
    { number: 1, state: "current", label: "Round 1 in play" },
    { number: 2, state: "upcoming", label: "Round 2 not played" },
    { number: 3, state: "upcoming", label: "Round 3 not played" },
  ]);
});

test("a Round won by the Participant shows as won, with their name", () => {
  expect(roundPips([wonBySeat0], 2, 0, names).pips).toEqual([
    { number: 1, state: "won", label: "Round 1 won by kaelen" },
    { number: 2, state: "current", label: "Round 2 in play" },
    { number: 3, state: "upcoming", label: "Round 3 not played" },
  ]);
});

test("a Round won by the Opponent shows as lost, with the Opponent's name", () => {
  expect(roundPips([wonBySeat0], 2, 1, names).pips[0]).toEqual({
    number: 1,
    state: "lost",
    label: "Round 1 won by vexwyrm",
  });
});

test("a drawn Round shows as drawn from both seats", () => {
  const drawnPip = { number: 1, state: "drawn", label: "Round 1 drawn" } as const;

  expect(roundPips([drawn], 2, 0, names).pips[0]).toEqual(drawnPip);
  expect(roundPips([drawn], 2, 1, names).pips[0]).toEqual(drawnPip);
});

test("between Rounds, the Round just finished shows its Outcome rather than being in play", () => {
  expect(roundPips([wonBySeat1], 1, 0, names).pips.map(({ state }) => state)).toEqual([
    "lost",
    "upcoming",
    "upcoming",
  ]);
});

test("a Duel finished 2-0 still shows three pips, the third not played", () => {
  expect(
    roundPips([wonBySeat0, wonBySeat0], null, 0, names).pips.map(({ state }) => state),
  ).toEqual(["won", "won", "upcoming"]);
});

test("a Duel finished in three Rounds shows each Round from the Participant's own seat", () => {
  const rounds = [wonBySeat0, wonBySeat1, wonBySeat0];

  expect(roundPips(rounds, null, 0, names).pips.map(({ state }) => state)).toEqual([
    "won",
    "lost",
    "won",
  ]);
  expect(roundPips(rounds, null, 1, names).pips.map(({ state }) => state)).toEqual([
    "lost",
    "won",
    "lost",
  ]);
});

test("before Round 1 and during a Round, the caption names the Round being played", () => {
  expect(roundPips([], 1, 0, names).caption).toBe("Round 1");
  expect(roundPips([wonBySeat0], 2, 0, names).caption).toBe("Round 2");
});

test("between Rounds, the caption names the next Round", () => {
  expect(roundPips([wonBySeat0], 1, 0, names).caption).toBe("Round 2");
  expect(roundPips([wonBySeat0, wonBySeat1], 2, 1, names).caption).toBe("Round 3");
});

test("once the deciding Round has ended, the caption says the Duel is over, even before the Duel ends", () => {
  expect(roundPips([wonBySeat0, wonBySeat0], 2, 0, names).caption).toBe("Duel over");
  expect(roundPips([wonBySeat0, wonBySeat1, drawn], 3, 1, names).caption).toBe("Duel over");
});

test("once the Duel has ended, the caption says the Duel is over", () => {
  expect(roundPips([wonBySeat0], null, 0, names).caption).toBe("Duel over");
});
