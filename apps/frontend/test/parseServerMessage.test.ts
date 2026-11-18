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
    journals: [[], []],
  };
  const roundEnd = {
    type: "roundEnd",
    round: 1,
    results: bothResults,
    outcomes: ["win", "loss"],
    nextStartAt: null,
  };
  // Each is a message as long as nothing is taken from it.
  expect(parseServerMessage(JSON.stringify(state))).not.toBeNull();
  expect(parseServerMessage(JSON.stringify(roundEnd))).not.toBeNull();
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
    { ...roundEnd, round: 0 },
    { ...roundEnd, results: [getResult(finished)] },
    { ...roundEnd, results: [getResult(finished), { ...getResult(finished), history: null }] },
    { ...roundEnd, outcomes: ["win", "tie"] },
    { ...roundEnd, nextStartAt: undefined },
    { type: "end", outcomes: ["win", "loss"] },
    { type: "end", outcomes: ["win"], rounds: [] },
    { type: "end", outcomes: ["win", "loss"], rounds: [{ outcomes: ["win", "loss"] }] },
    // The shape the end had when a Duel was a single Game each.
    { type: "end", results: bothResults, outcomes: ["win", "loss"] },
  ];

  for (const frame of malformed) {
    expect(parseServerMessage(JSON.stringify(frame))).toBeNull();
  }
});
