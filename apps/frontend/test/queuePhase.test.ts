import { expect, test } from "bun:test";
import { type QueuePhase, nextQueuePhase } from "../src/features/queue/phase/queuePhase.ts";

const notices: QueuePhase[] = [
  { kind: "removed", reason: "notAccepted" },
  { kind: "removed", reason: "replaced" },
  { kind: "removed", reason: "challenged" },
  { kind: "disconnected" },
  { kind: "refused", refusal: "Sign in to enter the Queue." },
];
const queued: QueuePhase = {
  kind: "queued",
  entry: { queuedAt: 1_000, serverAt: 4_000, receivedAt: 4_000 },
  requeued: false,
};
const proposed: QueuePhase = {
  kind: "proposed",
  pairingId: "pairing-1",
  players: {
    self: { nickname: "ada", avatarUrl: null, rank: null, ornament: null },
    opponent: { nickname: "bob", avatarUrl: null, rank: null, ornament: null },
  },
  window: { acceptWithinMs: 10_000, receivedAt: 5_000 },
  acceptSeconds: 10,
  accepted: false,
};
const enter = { key: "Enter", repeat: false };
const sendAccept = { kind: "sendAccept", pairingId: "pairing-1" } as const;

test("closing a notice takes the Queue back to idle, with nothing else to do", () => {
  for (const phase of notices)
    expect(nextQueuePhase(phase, { kind: "dismiss" })).toEqual({
      phase: { kind: "idle" },
      effects: [],
    });
});

test("closing a notice leaves a Queue that shows none untouched", () => {
  for (const phase of [{ kind: "idle" }, { kind: "connecting" }, queued] as const)
    expect(nextQueuePhase(phase, { kind: "dismiss" })).toEqual({ phase, effects: [] });
});

test("Enter pressed 400 ms after the Pairing was received accepts it", () => {
  expect(nextQueuePhase(proposed, { kind: "press", key: enter, at: 5_400 })).toEqual({
    phase: proposed,
    effects: [sendAccept],
  });
});

test("Enter pressed within the guard delay, or another key, accepts nothing", () => {
  for (const event of [
    { kind: "press", key: enter, at: 5_399 },
    { kind: "press", key: { key: " ", repeat: false }, at: 6_000 },
    { kind: "press", key: { key: "Enter", repeat: true }, at: 6_000 },
  ] as const)
    expect(nextQueuePhase(proposed, event)).toEqual({ phase: proposed, effects: [] });
});

test("Enter accepts nothing once accepted, while reconnecting or with no Pairing", () => {
  for (const phase of [
    { ...proposed, accepted: true },
    { kind: "reconnecting", held: proposed },
    queued,
  ] as const)
    expect(nextQueuePhase(phase, { kind: "press", key: enter, at: 6_000 })).toEqual({
      phase,
      effects: [],
    });
});

test("entering a Duel gives up an active Queue and closes its socket", () => {
  for (const phase of [
    { kind: "connecting" },
    queued,
    proposed,
    { kind: "reconnecting", held: queued },
    { kind: "paired", duelId: "duel-1" },
  ] as const) {
    const { phase: next, effects } = nextQueuePhase(phase, { kind: "leaveForDuel" });
    expect(next).toEqual({ kind: "idle" });
    expect(effects).toContainEqual({ kind: "close" });
  }
});

test("entering a Duel keeps the notice telling why the Player left the Queue", () => {
  for (const phase of notices)
    expect(nextQueuePhase(phase, { kind: "leaveForDuel" })).toEqual({ phase, effects: [] });
});

test("leaving the Queue, as signing out does, clears a notice too", () => {
  for (const phase of notices)
    expect(nextQueuePhase(phase, { kind: "leave" })).toEqual({
      phase: { kind: "idle" },
      effects: [{ kind: "close" }],
    });
});

test("entering again from a notice reopens the Queue socket", () => {
  for (const phase of notices)
    expect(nextQueuePhase(phase, { kind: "enter" })).toEqual({
      phase: { kind: "connecting" },
      effects: [{ kind: "close" }, { kind: "open" }],
    });
});
