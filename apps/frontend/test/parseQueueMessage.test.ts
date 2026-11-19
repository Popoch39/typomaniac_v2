import { expect, test } from "bun:test";
import type { QueueServerMessage } from "@repo/matchmaking-engine";
import { parseQueueMessage } from "../src/features/queue/message/parseQueueMessage.ts";

const players = {
  self: {
    nickname: "ada",
    avatarUrl: "https://avatars.example/ada.png",
    rank: { tier: "gold", division: 2, lp: 40 },
    ornament: { tier: "gold", division: 2 },
  },
  opponent: { nickname: "bob", avatarUrl: null, rank: null, ornament: null },
} as const;

test("a queued message is read back as it was sent", () => {
  const message: QueueServerMessage = { type: "queued", queuedAt: 1000, serverAt: 1500 };

  expect(parseQueueMessage(JSON.stringify(message))).toEqual(message);
});

test("a removed message is read back as it was sent", () => {
  const message: QueueServerMessage = { type: "removed", reason: "replaced" };

  expect(parseQueueMessage(JSON.stringify(message))).toEqual(message);
});

test("a proposed, a requeued and a paired message are read back as they were sent", () => {
  const messages: QueueServerMessage[] = [
    { type: "proposed", pairingId: "pairing", acceptWithinMs: 10_000, players },
    {
      type: "proposed",
      pairingId: "pairing",
      acceptWithinMs: 10_000,
      players: {
        self: { ...players.opponent, ornament: { tier: "unranked", division: null } },
        opponent: { ...players.self, rank: { tier: "master", lp: 320 }, ornament: null },
      },
    },
    { type: "requeued", queuedAt: 1000, serverAt: 12_000 },
    { type: "paired", duelId: "duel" },
  ];

  for (const message of messages) {
    expect(parseQueueMessage(JSON.stringify(message))).toEqual(message);
  }
});

test("a message removing a Player who did not accept is read back as it was sent", () => {
  const message: QueueServerMessage = { type: "removed", reason: "notAccepted" };

  expect(parseQueueMessage(JSON.stringify(message))).toEqual(message);
});

test("a frame that is not JSON is not a message", () => {
  expect(parseQueueMessage("Internal Server Error")).toBeNull();
});

test("a frame of an unknown type, or missing what its type requires, is not a message", () => {
  const malformed = [
    null,
    [],
    { type: "accepted" },
    { type: "paired" },
    { type: "paired", duelId: 7 },
    { type: "proposed", pairingId: "pairing", players },
    { type: "proposed", pairingId: 7, acceptWithinMs: 10_000, players },
    { type: "proposed", pairingId: "pairing", acceptWithinMs: 10_000 },
    {
      type: "proposed",
      pairingId: "pairing",
      acceptWithinMs: 10_000,
      players: { ...players, self: null },
    },
    {
      type: "proposed",
      pairingId: "pairing",
      acceptWithinMs: 10_000,
      players: { ...players, opponent: { ...players.opponent, avatarUrl: undefined } },
    },
    {
      type: "proposed",
      pairingId: "pairing",
      acceptWithinMs: 10_000,
      players: { ...players, self: { ...players.self, rank: { tier: "gold", lp: 40 } } },
    },
    {
      type: "proposed",
      pairingId: "pairing",
      acceptWithinMs: 10_000,
      players: {
        ...players,
        self: { ...players.self, ornament: { tier: "wood", division: null } },
      },
    },
    { type: "requeued", queuedAt: 1000 },
    { type: "queued", queuedAt: 1000 },
    { type: "queued", queuedAt: "now", serverAt: 1500 },
    { type: "removed" },
    { type: "removed", reason: "banned" },
  ];

  for (const frame of malformed) {
    expect(parseQueueMessage(JSON.stringify(frame))).toBeNull();
  }
});
