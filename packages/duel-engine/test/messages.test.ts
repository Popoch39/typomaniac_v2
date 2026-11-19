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
    rounds: [
      {
        results: [getResult(finished), getResult(finished)],
        multipliers: [1.07, 1],
        outcomes: ["win", "loss"],
      },
    ],
    startAt: 9000,
    words: ["cat", "dog"],
    participants: [
      {
        seat: 0,
        name: "ada",
        avatarUrl: "https://cdn.example.com/ada.png",
        ornament: { tier: "gold", division: 2 },
        connected: true,
      },
      { seat: 1, name: "Guest-4821", avatarUrl: null, ornament: null, connected: true },
    ],
    ranks: [{ tier: "gold", division: 2, lp: 40 }, null],
    journals: [[{ type: "start", at: 0 }], []],
  },
  {
    type: "presence",
    participant: { seat: 0, name: "ada", avatarUrl: null, ornament: null, connected: false },
  },
  { type: "countdown", round: 1, startAt: 4000, words: ["cat", "dog"] },
  { type: "opponentEvent", event: { type: "insert", at: 4200, text: "c" } },
  {
    type: "roundEnd",
    round: 1,
    results: [getResult(finished), getResult(finished)],
    multipliers: [1.0625, 1.0625],
    outcomes: ["draw", "draw"],
    nextStartAt: 42_000,
  },
  {
    type: "end",
    outcomes: ["draw", "draw"],
    rounds: [
      {
        results: [getResult(finished), getResult(finished)],
        multipliers: [1, 1],
        outcomes: ["draw", "draw"],
      },
    ],
    ranked: null,
  },
  {
    type: "end",
    outcomes: ["win", "loss"],
    rounds: [
      {
        results: [getResult(finished), getResult(finished)],
        multipliers: [1.1, 1.02],
        outcomes: ["win", "loss"],
      },
    ],
    ranked: [
      {
        lpDelta: 23,
        rankChange: "promoted",
        rank: { tier: "gold", division: 1, lp: 13 },
        placement: { played: 5, total: 5 },
      },
      { lpDelta: 0, rankChange: "none", rank: null, placement: { played: 2, total: 5 } },
    ],
  },
];

test("MESSAGE-1: every message passes through JSON unchanged", () => {
  expect(JSON.parse(JSON.stringify(clientMessages))).toEqual(clientMessages);
  expect(JSON.parse(JSON.stringify(serverMessages))).toEqual(serverMessages);
});
