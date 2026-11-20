import { expect, test } from "bun:test";
import type { GameEvent } from "@repo/typing-engine";
import { frameAt, replayTimeline } from "../src/features/admin/replay/replayTimeline.ts";

const WORDS = ["the", "cat", "sat"];

// A person typing `text` from `from`, one KeyPress every `gap` milliseconds, each held `hold`.
const typed = (text: string, from: number, gap: number, hold: number): GameEvent[] =>
  Array.from(text).flatMap((char, index) => {
    const at = from + index * gap;
    const code = char === " " ? "Space" : `Key${char.toUpperCase()}`;
    return [
      { type: "keyDown", at, code },
      { type: "insert", at, text: char },
      { type: "keyUp", at: at + hold, code },
    ] satisfies GameEvent[];
  });

// In the order of their instants, as the server journals them.
const journalOf = (...events: GameEvent[]) =>
  [...events].sort(
    (first, second) => ("at" in first ? first.at : 0) - ("at" in second ? second.at : 0),
  );

test("the replay shows the Game as it was at each instant of its journal, counted from its start", () => {
  const timeline = replayTimeline(
    WORDS,
    journalOf({ type: "start", at: 5000 }, ...typed("the ca", 5100, 100, 50)),
  );

  expect(frameAt(timeline, 0).inputs).toEqual(["", "", ""]);
  expect(frameAt(timeline, 99).inputs).toEqual(["", "", ""]);
  expect(frameAt(timeline, 100).inputs).toEqual(["t", "", ""]);
  expect(frameAt(timeline, 350).inputs).toEqual(["the", "", ""]);
  expect(frameAt(timeline, 400).inputs).toEqual(["the ", "", ""]);
  expect(frameAt(timeline, 400).activeWordIndex).toBe(1);
  expect(frameAt(timeline, 600).inputs).toEqual(["the ", "ca", ""]);
});

test("the replay lasts until the last instant of the journal and ends on the finished Game", () => {
  const timeline = replayTimeline(
    WORDS,
    journalOf({ type: "start", at: 0 }, ...typed("the cat", 100, 100, 50), {
      type: "tick",
      at: 30_000,
    }),
  );

  expect(timeline.duration).toBe(30_000);
  expect(frameAt(timeline, 29_999).status).toBe("running");
  const end = frameAt(timeline, 30_000);
  expect(end.status).toBe("finished");
  expect(end.inputs).toEqual(["the ", "cat", ""]);
  expect(frameAt(timeline, 45_000)).toBe(end);
});

test("an empty journal replays as a Game nobody started", () => {
  const timeline = replayTimeline(WORDS, []);

  expect(timeline.duration).toBe(0);
  expect(frameAt(timeline, 0).status).toBe("ready");
});
