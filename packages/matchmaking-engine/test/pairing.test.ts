import { expect, test } from "bun:test";
import { pairPlayers } from "../src/index.ts";

test("PAIR-1: the window of the longest-waiting Player decides, wherever they are in the input", () => {
  const queued = [
    { playerId: "bob", mmr: 1250, queuedAt: 20_000 },
    { playerId: "ada", mmr: 1500, queuedAt: 0 },
  ];

  // ada waited 20 seconds: 100 + 4 × 50 = 300, which holds the gap of 250; bob's window is still 100.
  expect(pairPlayers(queued, 20_000)).toEqual([["ada", "bob"]]);
});

test("PAIR-2: the longest-waiting Player is paired with the closest MMR inside their window", () => {
  const queued = [
    { playerId: "ada", mmr: 1200, queuedAt: 0 },
    { playerId: "bob", mmr: 1280, queuedAt: 1000 },
    { playerId: "cyd", mmr: 1190, queuedAt: 2000 },
  ];

  expect(pairPlayers(queued, 2000)).toEqual([["ada", "cyd"]]);
});

test("PAIR-3: between two equally close candidates, the one who waited longer is taken", () => {
  const queued = [
    { playerId: "ada", mmr: 1200, queuedAt: 0 },
    { playerId: "bob", mmr: 1250, queuedAt: 2000 },
    { playerId: "cyd", mmr: 1150, queuedAt: 1000 },
  ];

  expect(pairPlayers(queued, 2000)).toEqual([["ada", "cyd"]]);
});

test("PAIR-4: each remaining Player is considered in turn, so several pairs come out of one pass", () => {
  const queued = [
    { playerId: "ada", mmr: 1200, queuedAt: 0 },
    { playerId: "bob", mmr: 1800, queuedAt: 1000 },
    { playerId: "cyd", mmr: 1230, queuedAt: 2000 },
    { playerId: "dan", mmr: 1790, queuedAt: 3000 },
  ];

  expect(pairPlayers(queued, 3000)).toEqual([
    ["ada", "cyd"],
    ["bob", "dan"],
  ]);
});

test("PAIR-4: a Player with nobody inside their window stays unpaired and the next one is considered", () => {
  const queued = [
    { playerId: "ada", mmr: 3000, queuedAt: 0 },
    { playerId: "bob", mmr: 1200, queuedAt: 1000 },
    { playerId: "cyd", mmr: 1230, queuedAt: 2000 },
  ];

  expect(pairPlayers(queued, 2000)).toEqual([["bob", "cyd"]]);
});

test("PAIR-4: a Player already paired is not taken again, even as the closest MMR of a later Player", () => {
  const queued = [
    { playerId: "ada", mmr: 1200, queuedAt: 0 },
    { playerId: "bob", mmr: 1210, queuedAt: 1000 },
    { playerId: "cyd", mmr: 1215, queuedAt: 2000 },
    { playerId: "dan", mmr: 1310, queuedAt: 3000 },
  ];

  // cyd is closest to bob, who is taken by ada: cyd is paired with dan, 95 MMR away.
  expect(pairPlayers(queued, 3000)).toEqual([
    ["ada", "bob"],
    ["cyd", "dan"],
  ]);
});

test("PAIR-4: two Players outside every window are not paired", () => {
  const queued = [
    { playerId: "ada", mmr: 1200, queuedAt: 0 },
    { playerId: "bob", mmr: 1500, queuedAt: 0 },
  ];

  // 15 seconds waited: 100 + 3 × 50 = 250, short of the gap of 300.
  expect(pairPlayers(queued, 15_000)).toEqual([]);
});

test("PAIR-4: an empty Queue and a lone Player give no pair", () => {
  expect(pairPlayers([], 0)).toEqual([]);
  expect(pairPlayers([{ playerId: "ada", mmr: 1200, queuedAt: 0 }], 60_000)).toEqual([]);
});

test("PAIR-5: Players who entered at the same instant are ordered by id, whatever the input order", () => {
  const ada = { playerId: "ada", mmr: 1300, queuedAt: 0 };
  const mia = { playerId: "mia", mmr: 1290, queuedAt: 0 };
  const zed = { playerId: "zed", mmr: 1200, queuedAt: 0 };

  // ada decides first and takes mia, 10 MMR away; zed, who would have taken mia too, stays unpaired.
  expect(pairPlayers([ada, mia, zed], 0)).toEqual([["ada", "mia"]]);
  expect(pairPlayers([zed, mia, ada], 0)).toEqual([["ada", "mia"]]);
});

test("PAIR-5: equally close candidates who entered at the same instant are taken by id", () => {
  const ada = { playerId: "ada", mmr: 1200, queuedAt: 0 };
  const low = { playerId: "low", mmr: 1150, queuedAt: 1000 };
  const top = { playerId: "top", mmr: 1250, queuedAt: 1000 };

  expect(pairPlayers([ada, top, low], 1000)).toEqual([["ada", "low"]]);
  expect(pairPlayers([ada, low, top], 1000)).toEqual([["ada", "low"]]);
});
