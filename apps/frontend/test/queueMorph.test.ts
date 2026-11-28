import { expect, test } from "bun:test";
import { QUEUE_MORPH, queueMorphTypes } from "../src/features/queue/morph/queueMorph.ts";
import type { QueuePhase } from "../src/features/queue/phase/queuePhase.ts";

const queued = {
  kind: "queued",
  entry: { queuedAt: 1_000, serverAt: 4_000, receivedAt: 4_000 },
  requeued: false,
} as const;

const leaving = (phase: QueuePhase) =>
  queueMorphTypes({ phase, fromPath: "/ranked", toPath: "/practice" });
const returning = (phase: QueuePhase) =>
  queueMorphTypes({ phase, fromPath: "/practice", toPath: "/ranked" });

test("a queued Player leaving or reaching the Ranked page sees the Queue morph", () => {
  expect(leaving(queued)).toEqual([QUEUE_MORPH]);
  expect(returning(queued)).toEqual([QUEUE_MORPH]);
});

test("a reconnect keeps the morph of the Queue it holds", () => {
  expect(leaving({ kind: "reconnecting", held: queued })).toEqual([QUEUE_MORPH]);
});

test("no morph between two pages that both show the toast, or on the Ranked page itself", () => {
  expect(queueMorphTypes({ phase: queued, fromPath: "/practice", toPath: "/friends" })).toBe(false);
  expect(queueMorphTypes({ phase: queued, fromPath: "/ranked", toPath: "/ranked" })).toBe(false);
});

test("no morph on the first load, which has no page to come from", () => {
  expect(queueMorphTypes({ phase: queued, fromPath: undefined, toPath: "/ranked" })).toBe(false);
});

test("no morph for a Player who is not searching", () => {
  expect(leaving({ kind: "idle" })).toBe(false);
  expect(leaving({ kind: "connecting" })).toBe(false);
  expect(leaving({ kind: "disconnected" })).toBe(false);
  expect(returning({ kind: "paired", duelId: "duel-1" })).toBe(false);
});
