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
  { type: "state", seat: 0, round: 1, words: null, participants: [], journals: [[], []] },
  {
    type: "state",
    seat: 1,
    round: 1,
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
    type: "end",
    results: [getResult(finished), getResult(finished)],
    outcomes: ["win", "loss"],
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
    { type: "state", seat: 0, round: 1, words: ["cat"], participants: [], journals: [[]] },
    { type: "state", seat: 0, words: ["cat"], participants: [], journals: [[], []] },
    {
      type: "state",
      seat: 0,
      round: "first",
      words: ["cat"],
      participants: [],
      journals: [[], []],
    },
    { type: "state", seat: 0, round: 1, participants: [], journals: [[], []] },
    { type: "state", seat: 0, round: 1, words: "cat", participants: [], journals: [[], []] },
    { type: "end", results: [getResult(finished)], outcomes: ["win", "loss"] },
    {
      type: "end",
      results: [getResult(finished), { ...getResult(finished), history: null }],
      outcomes: ["win", "loss"],
    },
    { type: "end", results: [getResult(finished), getResult(finished)], outcomes: ["win", "tie"] },
  ];

  for (const frame of malformed) {
    expect(parseServerMessage(JSON.stringify(frame))).toBeNull();
  }
});
