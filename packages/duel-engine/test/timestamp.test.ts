import { expect, test } from "bun:test";
import type { GameEvent } from "@repo/typing-engine";
import { anchorStart, boundEvent, finalTickAt, TIMESTAMP_TOLERANCE_MS } from "../src/index.ts";

// A Game whose start was stamped 5000 by its client and anchored at 100_000 by the server.
const clock = { startedAt: 5000, anchorAt: 100_000 };

test("CONFIG-5: an Event may be stamped up to 1 second behind its receipt", () => {
  expect(TIMESTAMP_TOLERANCE_MS).toBe(1000);
});

test("TIMESTAMP-1: the anchor is the receipt of the start when it comes before the announced Start", () => {
  expect(anchorStart(9400, 10_000)).toBe(9400);
});

test("TIMESTAMP-1: the anchor is the announced Start when the start is received after it", () => {
  expect(anchorStart(10_600, 10_000)).toBe(10_000);
});

test("TIMESTAMP-2: an Event stamped as far behind its receipt as the tolerance keeps its timestamp", () => {
  const event: GameEvent = { type: "insert", at: 7000, text: "a" };

  // Stamped 2 seconds into the Game: received then, and received 1 second later.
  expect(boundEvent(event, { ...clock, receivedAt: 102_000 })).toEqual(event);
  expect(boundEvent(event, { ...clock, receivedAt: 103_000 })).toEqual(event);
});

test("TIMESTAMP-3: an Event stamped more than 1 second behind its receipt is moved up to the bound, with its content", () => {
  const events: GameEvent[] = [
    { type: "keyDown", at: 7000, code: "KeyA" },
    { type: "keyUp", at: 7000, code: "KeyA" },
    { type: "insert", at: 7000, text: "a" },
    { type: "delete", at: 7000, unit: "word" },
    { type: "tick", at: 7000 },
  ];

  // Received 3.5 seconds into the Game on the server's clock: the bound is 2.5 seconds into it.
  expect(events.map((event) => boundEvent(event, { ...clock, receivedAt: 103_500 }))).toEqual([
    { type: "keyDown", at: 7500, code: "KeyA" },
    { type: "keyUp", at: 7500, code: "KeyA" },
    { type: "insert", at: 7500, text: "a" },
    { type: "delete", at: 7500, unit: "word" },
    { type: "tick", at: 7500 },
  ]);
});

test("TIMESTAMP-3: an Event without a timestamp is left as it is", () => {
  const event: GameEvent = { type: "addWords", words: ["cat"] };

  expect(boundEvent(event, { ...clock, receivedAt: 150_000 })).toEqual(event);
});

test("TIMESTAMP-4: a timestamp ahead of its receipt is left alone", () => {
  const event: GameEvent = { type: "tick", at: 35_000 };

  expect(boundEvent(event, { ...clock, receivedAt: 100_010 })).toEqual(event);
});

test("TIMESTAMP-5: the bound only grows with the receipt, so a moved Event never lands after a later one", () => {
  const stamped: GameEvent = { type: "insert", at: 5001, text: "a" };

  const moved = [102_000, 102_001, 104_000, 129_000].map(
    (receivedAt) => boundEvent(stamped, { ...clock, receivedAt }) as { at: number },
  );
  const onTime = boundEvent({ type: "tick", at: 9100 }, { ...clock, receivedAt: 104_100 });

  expect(moved.map(({ at }) => at)).toEqual([6000, 6001, 8000, 33_000]);
  // Received after the third: it stays later than the Events moved before it.
  expect(onTime).toEqual({ type: "tick", at: 9100 });
});

test("TIMESTAMP-6: the final Tick of a silent Game is stamped 30 seconds after its start", () => {
  const journal: GameEvent[] = [
    { type: "start", at: 5000 },
    { type: "insert", at: 6000, text: "a" },
  ];

  expect(finalTickAt(5000, journal)).toBe(35_000);
});

test("TIMESTAMP-6: the final Tick of a silent Game is stamped no earlier than the last Event of its journal", () => {
  const journal: GameEvent[] = [
    { type: "start", at: 5000 },
    { type: "insert", at: 36_200, text: "a" },
  ];

  expect(finalTickAt(5000, journal)).toBe(36_200);
});
