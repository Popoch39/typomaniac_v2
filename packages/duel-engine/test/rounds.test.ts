import { expect, test } from "bun:test";
import {
  getDuelOutcomes,
  getRoundScore,
  MAX_ROUNDS,
  type Outcome,
  ROUND_PAUSE_MS,
  ROUNDS_TO_WIN,
} from "../src/index.ts";

const OUTCOMES = { W: ["win", "loss"], L: ["loss", "win"], D: ["draw", "draw"] } as const;

// The Round Outcomes of a Duel written from seat 0: "WLD" is a Round won, one lost and one drawn.
const rounds = (played: string) =>
  played.split("").map((letter): readonly [Outcome, Outcome] => {
    if (letter === "W" || letter === "L" || letter === "D") return OUTCOMES[letter];
    throw new Error(`Unknown Round Outcome: ${letter}`);
  });

test("CONFIG-6: a Duel is won with 2 Rounds, has 3 Rounds at most, and pauses 5 seconds between Rounds", () => {
  expect(ROUNDS_TO_WIN).toBe(2);
  expect(MAX_ROUNDS).toBe(3);
  expect(ROUND_PAUSE_MS).toBe(5000);
});

test("ROUND-1: the Round score counts the Rounds each Participant won, a drawn Round for neither", () => {
  expect(getRoundScore(rounds(""))).toEqual([0, 0]);
  expect(getRoundScore(rounds("W"))).toEqual([1, 0]);
  expect(getRoundScore(rounds("D"))).toEqual([0, 0]);
  expect(getRoundScore(rounds("WL"))).toEqual([1, 1]);
  expect(getRoundScore(rounds("LDL"))).toEqual([0, 2]);
});

test("ROUND-2: a Duel is not decided while nobody has won 2 Rounds and fewer than 3 are played", () => {
  for (const played of ["", "W", "L", "D", "WL", "LW", "WD", "DW", "LD", "DL", "DD"]) {
    expect(getDuelOutcomes(rounds(played))).toBeNull();
  }
});

test("ROUND-3: the first Participant to win 2 Rounds wins the Duel, without a third Round", () => {
  expect(getDuelOutcomes(rounds("WW"))).toEqual(["win", "loss"]);
  expect(getDuelOutcomes(rounds("LL"))).toEqual(["loss", "win"]);
});

test("ROUND-4: after 3 Rounds, the Duel goes to whoever won more Rounds", () => {
  const won = ["WLW", "LWW", "WDW", "DWW", "WDD", "DWD", "DDW"];
  const lost = ["WLL", "LWL", "LDL", "DLL", "LDD", "DLD", "DDL"];

  for (const played of won) expect(getDuelOutcomes(rounds(played))).toEqual(["win", "loss"]);
  for (const played of lost) expect(getDuelOutcomes(rounds(played))).toEqual(["loss", "win"]);
});

test("ROUND-5: after 3 Rounds won equally, the Duel is a draw", () => {
  for (const played of ["WLD", "WDL", "LWD", "LDW", "DWL", "DLW", "DDD"]) {
    expect(getDuelOutcomes(rounds(played))).toEqual(["draw", "draw"]);
  }
});
