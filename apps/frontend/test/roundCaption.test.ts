import { expect, test } from "bun:test";
import type { FinishedRound } from "@repo/duel-engine";
import { applyEvent, createGame, getResult } from "@repo/typing-engine";
import { roundCaption } from "../src/features/duel/round/roundCaption.ts";
import { summariseRound } from "../src/features/duel/round/summariseRound.ts";

const game = applyEvent(createGame({ mode: "time", seconds: 1 }, ["cat"]), {
  type: "start",
  at: 0,
});
const result = getResult(applyEvent(game, { type: "tick", at: 1000 }));
const worth931 = { ...result, wpm: 98, accuracy: 97.47 };
const worth857 = { ...result, wpm: 92, accuracy: 96.52 };

const participants = [
  { seat: 0, name: "kaelen", avatarUrl: null, ornament: null, guest: false, connected: true },
  { seat: 1, name: "vexwyrm", avatarUrl: null, ornament: null, guest: false, connected: true },
] as const;

const captionFrom = (round: FinishedRound, seat: 0 | 1) =>
  roundCaption(summariseRound(round, { number: 1, seat, participants }));

const wonBySeat0: FinishedRound = {
  results: [worth931, worth857],
  multipliers: [1, 1],
  outcomes: ["win", "loss"],
};

test("a won Round names the Participant as its winner, with their Points first", () => {
  expect(captionFrom(wonBySeat0, 0)).toBe("Round 1 to kaelen · 931 ×1.00 to 857 ×1.00 Points");
});

test("a lost Round names the Opponent as its winner, with their Points first", () => {
  expect(captionFrom(wonBySeat0, 1)).toBe("Round 1 to kaelen · 931 ×1.00 to 857 ×1.00 Points");
});

test("a Round won from the other seat reads the same from both seats", () => {
  const wonBySeat1: FinishedRound = {
    results: [worth857, worth931],
    multipliers: [1, 1],
    outcomes: ["loss", "win"],
  };

  expect(captionFrom(wonBySeat1, 0)).toBe("Round 1 to vexwyrm · 931 ×1.00 to 857 ×1.00 Points");
  expect(captionFrom(wonBySeat1, 1)).toBe("Round 1 to vexwyrm · 931 ×1.00 to 857 ×1.00 Points");
});

test("a drawn Round says it was drawn, with both Points", () => {
  const drawn: FinishedRound = {
    results: [worth931, worth931],
    multipliers: [1, 1],
    outcomes: ["draw", "draw"],
  };

  expect(captionFrom(drawn, 0)).toBe("Round 1 drawn · 931 ×1.00 to 931 ×1.00 Points");
  expect(captionFrom(drawn, 1)).toBe("Round 1 drawn · 931 ×1.00 to 931 ×1.00 Points");
});

test("the caption names the Round by its number", () => {
  const caption = roundCaption(summariseRound(wonBySeat0, { number: 3, seat: 0, participants }));

  expect(caption).toBe("Round 3 to kaelen · 931 ×1.00 to 857 ×1.00 Points");
});

test("the caption gives the Points the Multipliers of the Round made, each beside its Multiplier", () => {
  // 857 × 1.1 = 943 against 931 × 1.02 = 950: the Multipliers turned the Round.
  const turned: FinishedRound = {
    results: [worth857, worth931],
    multipliers: [1.1, 1.02],
    outcomes: ["loss", "win"],
  };

  expect(captionFrom(turned, 0)).toBe("Round 1 to vexwyrm · 950 ×1.02 to 943 ×1.10 Points");
});
