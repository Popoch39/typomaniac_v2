import { expect, test } from "bun:test";
import { DEFAULT_MATCHMAKING_CONFIG, pairPlayers } from "../src/index.ts";

test("CONFIG-1: the defaults are a first window of 100 MMR, widened by 50 every 5 seconds", () => {
  expect(DEFAULT_MATCHMAKING_CONFIG).toEqual({
    initialWindow: 100,
    windowStep: 50,
    windowStepIntervalMs: 5000,
  });
});

test("CONFIG-1: a configuration given replaces the first window, the step and its interval", () => {
  const config = { initialWindow: 10, windowStep: 5, windowStepIntervalMs: 1000 };
  const queued = [
    { playerId: "ada", mmr: 1200, queuedAt: 0 },
    { playerId: "bob", mmr: 1220, queuedAt: 0 },
  ];

  // 10 + 1 × 5 = 15 after 1 second, 10 + 2 × 5 = 20 after 2.
  expect(pairPlayers(queued, 0, config)).toEqual([]);
  expect(pairPlayers(queued, 1999, config)).toEqual([]);
  expect(pairPlayers(queued, 2000, config)).toEqual([["ada", "bob"]]);
});
