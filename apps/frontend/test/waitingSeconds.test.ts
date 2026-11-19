import { expect, test } from "bun:test";
import { waitingSeconds } from "../src/features/queue/clock/waitingSeconds.ts";

// Told at 50_000 on the client's clock that the Player has been queued for 2.5 s of server time.
const entry = { queuedAt: 1_000_000, serverAt: 1_002_500, receivedAt: 50_000 };

test("the waiting time starts from what the server said had already been waited", () => {
  expect(waitingSeconds(entry, 50_000)).toBe(2);
});

test("the waiting time grows with the client's clock, in whole seconds", () => {
  expect(waitingSeconds(entry, 50_499)).toBe(2);
  expect(waitingSeconds(entry, 50_500)).toBe(3);
  expect(waitingSeconds(entry, 110_500)).toBe(63);
});

test("the waiting time does not depend on the gap between the two clocks", () => {
  const skewed = { queuedAt: 1_000_000, serverAt: 1_000_000, receivedAt: 7 };

  expect(waitingSeconds(skewed, 4007)).toBe(4);
});

test("the waiting time is never negative", () => {
  expect(waitingSeconds(entry, 40_000)).toBe(0);
});
