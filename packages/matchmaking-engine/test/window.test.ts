import { expect, test } from "bun:test";
import { pairPlayers } from "../src/index.ts";

test("WINDOW-1: two Players who just entered are paired when their MMR gap is the first window, 100", () => {
  const queued = [
    { playerId: "ada", mmr: 1200, queuedAt: 0 },
    { playerId: "bob", mmr: 1300, queuedAt: 0 },
  ];

  expect(pairPlayers(queued, 0)).toEqual([["ada", "bob"]]);
});

test("WINDOW-1: two Players who just entered are not paired when their MMR gap is 101", () => {
  const queued = [
    { playerId: "ada", mmr: 1200, queuedAt: 0 },
    { playerId: "bob", mmr: 1301, queuedAt: 0 },
  ];

  expect(pairPlayers(queued, 0)).toEqual([]);
});

test("WINDOW-2: the window gains 50 MMR once 5 seconds are waited, not before", () => {
  const queued = [
    { playerId: "ada", mmr: 1200, queuedAt: 1000 },
    { playerId: "bob", mmr: 1350, queuedAt: 1000 },
  ];

  expect(pairPlayers(queued, 5999)).toEqual([]);
  expect(pairPlayers(queued, 6000)).toEqual([["ada", "bob"]]);
});

test("WINDOW-2: the window gains 50 MMR for each 5 seconds waited", () => {
  const queued = [
    { playerId: "ada", mmr: 1200, queuedAt: 0 },
    { playerId: "bob", mmr: 1400, queuedAt: 0 },
  ];

  // 100 + 1 × 50 = 150 after 5 seconds, 100 + 2 × 50 = 200 after 10.
  expect(pairPlayers(queued, 9999)).toEqual([]);
  expect(pairPlayers(queued, 10_000)).toEqual([["ada", "bob"]]);
});

test("WINDOW-3: the window has no cap", () => {
  const queued = [
    { playerId: "ada", mmr: 0, queuedAt: 0 },
    { playerId: "bob", mmr: 5000, queuedAt: 0 },
  ];

  // 100 + 98 × 50 = 5000 after 98 × 5 = 490 seconds.
  expect(pairPlayers(queued, 489_999)).toEqual([]);
  expect(pairPlayers(queued, 490_000)).toEqual([["ada", "bob"]]);
});

test("WINDOW-1: a Player stamped as entering after the instant given has the first window", () => {
  const queued = [
    { playerId: "ada", mmr: 1200, queuedAt: 6000 },
    { playerId: "bob", mmr: 1300, queuedAt: 6000 },
  ];

  expect(pairPlayers(queued, 0)).toEqual([["ada", "bob"]]);
});
