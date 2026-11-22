import { expect, test } from "bun:test";
import { DUEL_GAME_CONFIG, END_GRACE_MS } from "@repo/duel-engine";
import { getResult } from "@repo/typing-engine";
import { type DuelPhase, nextStep, type RoundPhase } from "../src/modules/duel/phase.ts";
import { type DuelKind, replayGame } from "../src/modules/duel/service.ts";

const COUNTDOWN_MS = 3000;
const NOW = 1_000_000;
// From the Start of a Round to the instant the sweep closes the Games still open.
const CLOSE_AFTER_MS = DUEL_GAME_CONFIG.seconds * 1000 + END_GRACE_MS;

const RESULT = getResult(
  replayGame(
    ["a"],
    [
      { type: "start", at: 0 },
      { type: "tick", at: 30_000 },
    ],
  ),
);
const END = {
  results: [RESULT, RESULT],
  multipliers: [1, 1],
  outcomes: ["draw", "draw"],
  endedAt: NOW,
} as const;

const duelIn = (
  round: RoundPhase,
  {
    kind = "custom",
    phase = { kind: "playing" },
  }: {
    readonly kind?: DuelKind;
    readonly phase?: DuelPhase;
  } = {},
) => ({ kind, phase, round: { number: 2, words: ["a"], phase: round } });

test("a Duel that expired or was finalised is forgotten", () => {
  expect(nextStep(null, NOW, COUNTDOWN_MS)).toEqual({ kind: "forget" });
  const end = { type: "end", outcomes: ["win", "loss"], ranked: null, rounds: [] } as const;
  const finalised = duelIn(
    { kind: "ended", startAt: NOW - 40_000, end: END },
    {
      phase: { kind: "finalised", end },
    },
  );
  expect(nextStep(finalised, NOW, COUNTDOWN_MS)).toEqual({ kind: "forget" });
});

test("a decided Duel is finalised, as is one whose current Round has ended", () => {
  const ended: RoundPhase = { kind: "ended", startAt: NOW - 40_000, end: END };
  expect(nextStep(duelIn(ended, { phase: { kind: "decided" } }), NOW, COUNTDOWN_MS)).toEqual({
    kind: "finalise",
  });
  expect(nextStep(duelIn(ended), NOW, COUNTDOWN_MS)).toEqual({ kind: "finalise" });
});

test("a ranked Duel waiting for its first Start has its Countdown forced now, a Custom one waits", () => {
  const open = { phase: { kind: "open" } } as const;
  expect(
    nextStep(duelIn({ kind: "awaitingStart" }, { ...open, kind: "ranked" }), NOW, COUNTDOWN_MS),
  ).toEqual({ kind: "announce", round: 2, startAt: NOW + COUNTDOWN_MS, forced: true });
  expect(nextStep(duelIn({ kind: "awaitingStart" }, open), NOW, COUNTDOWN_MS)).toBeNull();
});

test("a scheduled Round is announced once its Countdown begins, never with a Start in the past", () => {
  const startAt = NOW + 5000;
  const scheduled = duelIn({ kind: "scheduled", startAt });
  expect(nextStep(scheduled, startAt - COUNTDOWN_MS - 1, COUNTDOWN_MS)).toBeNull();
  expect(nextStep(scheduled, startAt - COUNTDOWN_MS, COUNTDOWN_MS)).toEqual({
    kind: "announce",
    round: 2,
    startAt,
    forced: false,
  });
  // Swept late: the Countdown still lasts in full.
  expect(nextStep(scheduled, startAt + 1000, COUNTDOWN_MS)).toEqual({
    kind: "announce",
    round: 2,
    startAt: startAt + 1000 + COUNTDOWN_MS,
    forced: false,
  });
});

test("an announced Round has its Games still open closed once its deadline has passed", () => {
  const startAt = NOW;
  const announced: RoundPhase[] = [
    { kind: "countdown", startAt },
    { kind: "running", startAt, anchors: [startAt, null], gamesEnded: [true, false] },
  ];
  for (const round of announced) {
    expect(nextStep(duelIn(round), startAt + CLOSE_AFTER_MS - 1, COUNTDOWN_MS)).toBeNull();
    expect(nextStep(duelIn(round), startAt + CLOSE_AFTER_MS, COUNTDOWN_MS)).toEqual({
      kind: "close",
      round: 2,
    });
  }
});
