import { expect, test } from "bun:test";
import type { QueueClientMessage, QueueServerMessage } from "../src/index.ts";

const serverMessages: QueueServerMessage[] = [
  { type: "queued", queuedAt: 1000, serverAt: 1500 },
  {
    type: "proposed",
    pairingId: "pairing",
    acceptWithinMs: 10_000,
    accepted: false,
    players: {
      self: {
        nickname: "ada",
        avatarUrl: "https://avatars.example/ada.png",
        rank: { tier: "gold", division: 2, lp: 40 },
        ornament: { tier: "gold", division: 2 },
      },
      opponent: { nickname: "bob", avatarUrl: null, rank: null, ornament: null },
    },
  },
  { type: "requeued", queuedAt: 1000, serverAt: 12_000 },
  { type: "removed", reason: "replaced" },
  { type: "removed", reason: "notAccepted" },
  { type: "removed", reason: "challenged" },
  { type: "paired", duelId: "duel" },
];

const clientMessages: QueueClientMessage[] = [{ type: "accept", pairingId: "pairing" }];

test("MESSAGE-1: every message passes through JSON unchanged", () => {
  expect(JSON.parse(JSON.stringify(serverMessages))).toEqual(serverMessages);
  expect(JSON.parse(JSON.stringify(clientMessages))).toEqual(clientMessages);
});
