import { expect, test } from "bun:test";
import type { GameEvent } from "@repo/typing-engine";
import { keyPressBars } from "../src/features/admin/replay/keyPressBars.ts";
import { replayTimeline } from "../src/features/admin/replay/replayTimeline.ts";

const WORDS = ["the", "cat"];

// t down at 1000 and up at 1300; h down at 1200, while t is still down, and up at 1350; e alone after.
const rollover: GameEvent[] = [
  { type: "start", at: 1000 },
  { type: "keyDown", at: 1000, code: "KeyT" },
  { type: "insert", at: 1000, text: "t" },
  { type: "keyDown", at: 1200, code: "KeyH" },
  { type: "insert", at: 1200, text: "h" },
  { type: "keyUp", at: 1300, code: "KeyT" },
  { type: "keyUp", at: 1350, code: "KeyH" },
  { type: "keyDown", at: 1500, code: "KeyE" },
  { type: "insert", at: 1500, text: "e" },
  { type: "keyUp", at: 1600, code: "KeyE" },
];

test("each KeyPress is shown from the instant its key went down to the instant it was released", () => {
  const timeline = replayTimeline(WORDS, rollover);

  expect(keyPressBars(timeline, 1000, 1000)).toEqual([
    { code: "KeyT", lane: 0, from: 0, to: 0.3, held: false },
    { code: "KeyH", lane: 1, from: 0.2, to: 0.35, held: false },
    { code: "KeyE", lane: 0, from: 0.5, to: 0.6, held: false },
  ]);
});

test("a key still down at the instant shown is drawn up to that instant, as held", () => {
  const timeline = replayTimeline(WORDS, rollover);

  expect(keyPressBars(timeline, 250, 1000)).toEqual([
    { code: "KeyT", lane: 0, from: 0.75, to: 1, held: true },
    { code: "KeyH", lane: 1, from: 0.95, to: 1, held: true },
  ]);
});

test("a KeyPress released before the window shown is no longer drawn, and one that left it is cut at its edge", () => {
  const timeline = replayTimeline(WORDS, rollover);

  expect(keyPressBars(timeline, 1500, 1000)).toEqual([
    { code: "KeyE", lane: 0, from: 0, to: 0.1, held: false },
  ]);
  expect(keyPressBars(timeline, 1100, 1000)).toEqual([
    { code: "KeyT", lane: 0, from: 0, to: 0.2, held: false },
    { code: "KeyH", lane: 1, from: 0.1, to: 0.25, held: false },
    { code: "KeyE", lane: 0, from: 0.4, to: 0.5, held: false },
  ]);
});

test("a key never released is held until the end of the replay", () => {
  const timeline = replayTimeline(WORDS, [
    { type: "start", at: 0 },
    { type: "keyDown", at: 0, code: "KeyT" },
    { type: "insert", at: 0, text: "t" },
    { type: "tick", at: 500 },
  ]);

  expect(keyPressBars(timeline, 500, 1000)).toEqual([
    { code: "KeyT", lane: 0, from: 0.5, to: 1, held: true },
  ]);
});
