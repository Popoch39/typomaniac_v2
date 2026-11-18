import { expect, test } from "bun:test";
import type { QueueServerMessage } from "../src/index.ts";

const serverMessages: QueueServerMessage[] = [
  { type: "queued", queuedAt: 1000, serverAt: 1500 },
  { type: "removed", reason: "replaced" },
];

test("MESSAGE-1: every message passes through JSON unchanged", () => {
  expect(JSON.parse(JSON.stringify(serverMessages))).toEqual(serverMessages);
});
