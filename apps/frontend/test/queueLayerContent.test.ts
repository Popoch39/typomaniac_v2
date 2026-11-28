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

const off = (phase: QueuePhase) => queueLayerContent({ phase, isOnRankedPage: false });
const on = (phase: QueuePhase) => queueLayerContent({ phase, isOnRankedPage: true });

test("off the Ranked page, a queued Player sees the searching toast", () => {
  expect(off(queued)).toEqual({ kind: "searching" });
  expect(off({ ...queued, requeued: true })).toEqual({ kind: "searching" });
});

test("off the Ranked page, a proposed Pairing opens the prompt, accepted or not", () => {
  expect(off(proposed)).toEqual({ kind: "pairing" });
  expect(off({ ...proposed, accepted: true })).toEqual({ kind: "pairing" });
});

test("a reconnecting socket keeps the toast or the prompt it held", () => {
  expect(off({ kind: "reconnecting", held: queued })).toEqual({ kind: "searching" });
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
