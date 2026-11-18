import { expect, test } from "bun:test";
import type { QueueServerMessage } from "@repo/matchmaking-engine";
import { parseQueueMessage } from "../src/features/queue/message/parseQueueMessage.ts";

test("a queued message is read back as it was sent", () => {
  const message: QueueServerMessage = { type: "queued", queuedAt: 1000, serverAt: 1500 };

  expect(parseQueueMessage(JSON.stringify(message))).toEqual(message);
});

test("a removed message is read back as it was sent", () => {
  const message: QueueServerMessage = { type: "removed", reason: "replaced" };

  expect(parseQueueMessage(JSON.stringify(message))).toEqual(message);
});

test("a frame that is not JSON is not a message", () => {
  expect(parseQueueMessage("Internal Server Error")).toBeNull();
});

test("a frame of an unknown type, or missing what its type requires, is not a message", () => {
  const malformed = [
    null,
    [],
    { type: "paired" },
    { type: "queued", queuedAt: 1000 },
    { type: "queued", queuedAt: "now", serverAt: 1500 },
    { type: "removed" },
    { type: "removed", reason: "banned" },
  ];

  for (const frame of malformed) {
    expect(parseQueueMessage(JSON.stringify(frame))).toBeNull();
  }
});
