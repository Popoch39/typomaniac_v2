import { expect, test } from "bun:test";
import { applyEvent, createGame, getResult } from "@repo/typing-engine";
import type { ClientMessage, ServerMessage } from "../src/index.ts";

const finished = applyEvent(
  applyEvent(createGame({ mode: "time", seconds: 1 }, ["cat"]), { type: "start", at: 0 }),
  {
    type: "tick",
    at: 1000,
  },
);

const clientMessages: ClientMessage[] = [
  { type: "ping", clientAt: 1000 },
  { type: "event", round: 1, event: { type: "keyDown", at: 1200, code: "KeyC" } },
];

const serverMessages: ServerMessage[] = [
  { type: "pong", clientAt: 1000, serverAt: 1500 },
  {
    type: "state",
    seat: 1,
    round: 2,
    rounds: [{ results: [getResult(finished), getResult(finished)], outcomes: ["win", "loss"] }],
    startAt: 9000,
    words: ["cat", "dog"],
    participants: [
      { seat: 0, name: "ada", connected: true },
      { seat: 1, name: "Guest-4821", connected: true },
    ],
    journals: [[{ type: "start", at: 0 }], []],
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
    type: "end",
    outcomes: ["draw", "draw"],
    rounds: [{ results: [getResult(finished), getResult(finished)], outcomes: ["draw", "draw"] }],
  },
];

test("MESSAGE-1: every message passes through JSON unchanged", () => {
  expect(JSON.parse(JSON.stringify(clientMessages))).toEqual(clientMessages);
  expect(JSON.parse(JSON.stringify(serverMessages))).toEqual(serverMessages);
});
