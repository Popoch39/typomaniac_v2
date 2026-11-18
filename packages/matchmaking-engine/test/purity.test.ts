import { expect, test } from "bun:test";
import { DEFAULT_MATCHMAKING_CONFIG, pairPlayers, type QueuedPlayer } from "../src/index.ts";

// Out of entry order, so that ordering the Queue in place would show.
const QUEUED: QueuedPlayer[] = [
  { playerId: "cyd", mmr: 1230, queuedAt: 2000 },
  { playerId: "ada", mmr: 1200, queuedAt: 0 },
  { playerId: "bob", mmr: 1800, queuedAt: 1000 },
];

test("PURE-1: pairing never modifies the queued Players or the configuration it receives", () => {
  const queued = structuredClone(QUEUED);
  const config = structuredClone(DEFAULT_MATCHMAKING_CONFIG);

  pairPlayers(queued, 2000, config);

  expect(queued).toEqual(QUEUED);
  expect(config).toEqual(DEFAULT_MATCHMAKING_CONFIG);
});

test("PURE-1: the same queued Players, instant and configuration always give the same pairs", () => {
  expect(pairPlayers(QUEUED, 2000)).toEqual(pairPlayers(structuredClone(QUEUED), 2000));
});

test("PURE-1: the pairs pass through JSON unchanged", () => {
  const pairs = pairPlayers(QUEUED, 2000);

  expect(JSON.parse(JSON.stringify(pairs))).toEqual(pairs);
  expect(pairs).toEqual([["ada", "cyd"]]);
});
