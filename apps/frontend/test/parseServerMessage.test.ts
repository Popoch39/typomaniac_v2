import { expect, test } from "bun:test";
import type { ServerMessage } from "@repo/duel-engine";
import { applyEvent, createGame, getResult } from "@repo/typing-engine";
import { parseServerMessage } from "../src/features/duel/message/parseServerMessage.ts";

const finished = applyEvent(
  applyEvent(createGame({ mode: "time", seconds: 1 }, ["cat"]), { type: "start", at: 0 }),
  { type: "tick", at: 1000 },
);

const messages: ServerMessage[] = [
  { type: "pong", clientAt: 1000, serverAt: 1500 },
  // Before the Countdown is announced, the Target words of the Round are held back.
  {
    type: "state",
    seat: 0,
    round: 1,
    rounds: [],
    startAt: null,
    words: null,
    participants: [],
    ranks: null,
    journals: [[], []],
  },
  // Between two Rounds: the Round that ended, and the Start of the next one before its words.
  {
    type: "state",
    seat: 0,
    round: 2,
    rounds: [{ results: [getResult(finished), getResult(finished)], outcomes: ["win", "loss"] }],
    startAt: 9000,
    words: null,
    participants: [],
    ranks: null,
    journals: [[], []],
  },
  {
    type: "state",
    seat: 1,
    round: 1,
    rounds: [],
    startAt: 4000,
    words: ["cat", "dog"],
    participants: [
      { seat: 0, name: "ada", connected: true },
      { seat: 1, name: "Guest 4821", connected: false },
    ],
    // A ranked Duel: each Player's Rank, or none while Unranked.
    ranks: [{ tier: "gold", division: 2, lp: 40 }, null],
    journals: [
      [
        { type: "start", at: 0 },
        { type: "keyDown", at: 10, code: "KeyC" },
        { type: "keyUp", at: 20, code: "KeyC" },
        { type: "insert", at: 10, text: "c" },
        { type: "delete", at: 30, unit: "word" },
        { type: "tick", at: 1000 },
      ],
      [{ type: "addWords", words: ["owl"] }],
    ],
  },
  { type: "presence", participant: { seat: 0, name: "ada", connected: false } },
  { type: "countdown", round: 1, startAt: 4000, words: ["cat", "dog"] },
  { type: "opponentEvent", event: { type: "insert", at: 4200, text: "c" } },
  {
    type: "roundEnd",
    round: 1,
    results: [getResult(finished), getResult(finished)],
    outcomes: ["draw", "draw"],
    nextStartAt: 42_000,
  },
  {
    type: "roundEnd",
    round: 2,
    results: [getResult(finished), getResult(finished)],
    outcomes: ["win", "loss"],
    nextStartAt: null,
  },
  {
    type: "end",
    outcomes: ["win", "loss"],
    rounds: [
      { results: [getResult(finished), getResult(finished)], outcomes: ["draw", "draw"] },
      { results: [getResult(finished), getResult(finished)], outcomes: ["win", "loss"] },
    ],
    ranked: null,
  },
  // A ranked Duel: what it did to each Player's Standing, a Master and a Player still Unranked.
  {
    type: "end",
    outcomes: ["win", "loss"],
    rounds: [],
    ranked: [
      {
        lpDelta: 23,
        rankChange: "promoted",
        rank: { tier: "master", lp: 3 },
        placement: { played: 5, total: 5 },
      },
      { lpDelta: 0, rankChange: "none", rank: null, placement: { played: 2, total: 5 } },
    ],
  },
  {
    type: "end",
    outcomes: ["loss", "win"],
    rounds: [],
    ranked: [
      {
        lpDelta: -23,
        rankChange: "demoted",
        rank: { tier: "gold", division: 3, lp: 75 },
        placement: { played: 5, total: 5 },
      },
      {
        lpDelta: 0,
        rankChange: "placed",
        rank: { tier: "silver", division: 2, lp: 0 },
        placement: { played: 5, total: 5 },
      },
    ],
  },
];

test("each message the server sends is read back as it was sent", () => {
  for (const message of messages) {
    expect(parseServerMessage(JSON.stringify(message))).toEqual(message);
  }
});

test("a frame that is not JSON is not a message", () => {
  expect(parseServerMessage("Internal Server Error")).toBeNull();
});

test("a frame of an unknown type, or missing what its type requires, is not a message", () => {
  const bothResults = [getResult(finished), getResult(finished)];
  const state = {
    type: "state",
    seat: 0,
    round: 1,
    rounds: [],
    startAt: null,
    words: ["cat"],
    participants: [],
    ranks: null,
    journals: [[], []],
  };
  const roundEnd = {
    type: "roundEnd",
    round: 1,
    results: bothResults,
    outcomes: ["win", "loss"],
    nextStartAt: null,
  };
  const rankedEnd = {
    lpDelta: 18,
    rankChange: "none",
    rank: { tier: "gold", division: 2, lp: 63 },
    placement: { played: 5, total: 5 },
  };
  const end = {
    type: "end",
    outcomes: ["win", "loss"],
    rounds: [],
    ranked: [rankedEnd, rankedEnd],
  };
  // Each is a message as long as nothing is taken from it.
  expect(parseServerMessage(JSON.stringify(state))).not.toBeNull();
  expect(parseServerMessage(JSON.stringify(roundEnd))).not.toBeNull();
  expect(parseServerMessage(JSON.stringify(end))).not.toBeNull();
  const malformed = [
    null,
    [],
    { type: "surrender" },
    { type: "pong", clientAt: 1000 },
    { type: "countdown", round: 1, startAt: "soon", words: ["cat"] },
    { type: "countdown", startAt: 4000, words: ["cat"] },
    { type: "countdown", round: 0, startAt: 4000, words: ["cat"] },
    { type: "countdown", round: 1.5, startAt: 4000, words: ["cat"] },
    { type: "countdown", round: 1, startAt: 4000 },
    { type: "countdown", round: 1, startAt: 4000, words: null },
    { type: "countdown", round: 1, startAt: 4000, words: ["cat", 3] },
    { type: "presence", participant: { seat: 2, name: "ada", connected: true } },
    { type: "opponentEvent", event: { type: "insert", at: 10 } },
    { type: "opponentEvent", event: { type: "delete", at: 10, unit: "line" } },
    { type: "opponentEvent", event: { type: "jump", at: 10 } },
    { ...state, journals: [[]] },
    { ...state, round: undefined },
    { ...state, round: "first" },
    { ...state, words: undefined },
    { ...state, words: "cat" },
    { ...state, rounds: undefined },
    { ...state, rounds: [{ results: bothResults }] },
    { ...state, startAt: undefined },
    { ...state, startAt: "soon" },
    { ...state, ranks: undefined },
    { ...state, ranks: [null] },
    { ...state, ranks: [null, { tier: "wood", division: 2, lp: 0 }] },
    { ...roundEnd, round: 0 },
    { ...roundEnd, results: [getResult(finished)] },
    { ...roundEnd, results: [getResult(finished), { ...getResult(finished), history: null }] },
    { ...roundEnd, outcomes: ["win", "tie"] },
    { ...roundEnd, nextStartAt: undefined },
    { type: "end", outcomes: ["win", "loss"], ranked: null },
    { type: "end", outcomes: ["win"], rounds: [], ranked: null },
    {
      type: "end",
      outcomes: ["win", "loss"],
      rounds: [{ outcomes: ["win", "loss"] }],
      ranked: null,
    },
    { ...end, ranked: undefined },
    { ...end, ranked: [rankedEnd] },
    { ...end, ranked: [rankedEnd, { ...rankedEnd, lpDelta: "many" }] },
    { ...end, ranked: [rankedEnd, { ...rankedEnd, rankChange: "relegated" }] },
    { ...end, ranked: [rankedEnd, { ...rankedEnd, rank: undefined }] },
    { ...end, ranked: [rankedEnd, { ...rankedEnd, rank: { tier: "wood", division: 2, lp: 0 } }] },
    { ...end, ranked: [rankedEnd, { ...rankedEnd, rank: { tier: "gold", division: 5, lp: 0 } }] },
    { ...end, ranked: [rankedEnd, { ...rankedEnd, rank: { tier: "gold", lp: 0 } }] },
    { ...end, ranked: [rankedEnd, { ...rankedEnd, rank: { tier: "master" } }] },
    { ...end, ranked: [rankedEnd, { ...rankedEnd, placement: { played: 5 } }] },
    // The shape the end had when a Duel was a single Game each.
    { type: "end", results: bothResults, outcomes: ["win", "loss"] },
  ];

  for (const frame of malformed) {
    expect(parseServerMessage(JSON.stringify(frame))).toBeNull();
  }
});
