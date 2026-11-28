import { expect, test } from "bun:test";
import type { PairingSide } from "@repo/matchmaking-engine";
import { queueLayerContent } from "../src/features/queue/layer/queueLayerContent.ts";
import type { QueuePhase } from "../src/features/queue/phase/queuePhase.ts";

const side: PairingSide = { nickname: "ada", avatarUrl: null, rank: null, ornament: null };
const queued = {
  kind: "queued",
  entry: { queuedAt: 1_000, serverAt: 4_000, receivedAt: 4_000 },
  requeued: false,
} as const;
const proposed = {
  kind: "proposed",
  pairingId: "pairing-1",
  players: { self: side, opponent: { ...side, nickname: "bob" } },
  window: { acceptWithinMs: 10_000, receivedAt: 5_000 },
  acceptSeconds: 10,
  accepted: false,
} as const;

const off = (phase: QueuePhase) =>
  queueLayerContent({ phase, isOnRankedPage: false, isPracticeGameRunning: false });
const on = (phase: QueuePhase) =>
  queueLayerContent({ phase, isOnRankedPage: true, isPracticeGameRunning: false });
const practising = (phase: QueuePhase) =>
  queueLayerContent({ phase, isOnRankedPage: false, isPracticeGameRunning: true });

const searching = { kind: "searching", isDimmed: false } as const;

test("off the Ranked page, a queued Player sees the searching toast", () => {
  expect(off(queued)).toEqual(searching);
  expect(off({ ...queued, requeued: true })).toEqual(searching);
});

test("the searching toast is dimmed exactly while a Practice Game is running", () => {
  expect(practising(queued)).toEqual({ kind: "searching", isDimmed: true });
  expect(practising({ kind: "reconnecting", held: queued })).toEqual({
    kind: "searching",
    isDimmed: true,
  });
  expect(off(queued)).toEqual({ kind: "searching", isDimmed: false });
});

test("a running Practice Game never dims the Pairing prompt nor shows the Queue on the Ranked page", () => {
  expect(practising(proposed)).toEqual({ kind: "pairing" });
  expect(
    queueLayerContent({ phase: queued, isOnRankedPage: true, isPracticeGameRunning: true }),
  ).toEqual({ kind: "none" });
});

test("off the Ranked page, a proposed Pairing opens the prompt, accepted or not", () => {
  expect(off(proposed)).toEqual({ kind: "pairing" });
  expect(off({ ...proposed, accepted: true })).toEqual({ kind: "pairing" });
});

test("a reconnecting socket keeps the toast or the prompt it held", () => {
  expect(off({ kind: "reconnecting", held: queued })).toEqual(searching);
  expect(off({ kind: "reconnecting", held: proposed })).toEqual({ kind: "pairing" });
});

test("on the Ranked page the layer shows nothing: the Queue panel already does", () => {
  for (const phase of [
    queued,
    proposed,
    { kind: "reconnecting", held: queued },
    { kind: "reconnecting", held: proposed },
  ] as const)
    expect(on(phase)).toEqual({ kind: "none" });
});

test("a Player who is not queued or proposed sees nothing, on any page", () => {
  const phases: QueuePhase[] = [
    { kind: "idle" },
    { kind: "connecting" },
    { kind: "paired", duelId: "duel-1" },
    { kind: "removed", reason: "notAccepted" },
    { kind: "removed", reason: "replaced" },
    { kind: "removed", reason: "challenged" },
    { kind: "refused", refusal: "Sign in to enter the Queue." },
    { kind: "disconnected" },
  ];
  for (const phase of phases) {
    expect(off(phase)).toEqual({ kind: "none" });
    expect(on(phase)).toEqual({ kind: "none" });
  }
});
