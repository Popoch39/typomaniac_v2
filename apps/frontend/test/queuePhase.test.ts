import { expect, test } from "bun:test";
import { type QueuePhase, nextQueuePhase } from "../src/features/queue/phase/queuePhase.ts";

const notices: QueuePhase[] = [
  { kind: "removed", reason: "notAccepted" },
  { kind: "removed", reason: "replaced" },
  { kind: "removed", reason: "challenged" },
  { kind: "disconnected" },
  { kind: "refused", refusal: "Sign in to enter the Queue." },
];

test("closing a notice takes the Queue back to idle, with nothing else to do", () => {
  for (const phase of notices)
    expect(nextQueuePhase(phase, { kind: "dismiss" })).toEqual({
      phase: { kind: "idle" },
      effects: [],
    });
});

test("closing a notice leaves a Queue that shows none untouched", () => {
  const queued: QueuePhase = {
    kind: "queued",
    entry: { queuedAt: 1_000, serverAt: 4_000, receivedAt: 4_000 },
    requeued: false,
  };
  for (const phase of [{ kind: "idle" }, { kind: "connecting" }, queued] as const)
    expect(nextQueuePhase(phase, { kind: "dismiss" })).toEqual({ phase, effects: [] });
});

test("entering again from a notice reopens the Queue socket", () => {
  for (const phase of notices)
    expect(nextQueuePhase(phase, { kind: "enter" })).toEqual({
      phase: { kind: "connecting" },
      effects: [{ kind: "close" }, { kind: "open" }],
    });
});
