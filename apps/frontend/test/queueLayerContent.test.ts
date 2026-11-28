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

test("a Player who is neither in the Queue nor told why they left it sees nothing, on any page", () => {
  for (const phase of [{ kind: "idle" }, { kind: "paired", duelId: "duel-1" }] as const) {
    expect(off(phase)).toEqual({ kind: "none" });
    expect(on(phase)).toEqual({ kind: "none" });
  }
});

const notices: QueuePhase[] = [
  { kind: "removed", reason: "notAccepted" },
  { kind: "removed", reason: "replaced" },
  { kind: "removed", reason: "challenged" },
  { kind: "disconnected" },
  { kind: "refused", refusal: "Sign in to enter the Queue." },
];

test("off the Ranked page, the toast tells why the Player is not queued", () => {
  expect(off({ kind: "removed", reason: "notAccepted" })).toEqual({
    kind: "removed",
    reason: "notAccepted",
  });
  expect(off({ kind: "removed", reason: "replaced" })).toEqual({
    kind: "removed",
    reason: "replaced",
  });
  expect(off({ kind: "removed", reason: "challenged" })).toEqual({
    kind: "removed",
    reason: "challenged",
  });
  expect(off({ kind: "disconnected" })).toEqual({ kind: "disconnected" });
  expect(off({ kind: "refused", refusal: "Sign in to enter the Queue." })).toEqual({
    kind: "refused",
    refusal: "Sign in to enter the Queue.",
  });
});

test("on the Ranked page no notice is shown by the layer: the Queue panel tells it", () => {
  for (const phase of notices) expect(on(phase)).toEqual({ kind: "none" });
});

test("off the Ranked page, entering again keeps the toast while the socket opens", () => {
  expect(off({ kind: "connecting" })).toEqual({ kind: "entering" });
  expect(on({ kind: "connecting" })).toEqual({ kind: "none" });
});
