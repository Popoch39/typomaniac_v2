import { expect, test } from "bun:test";
import { acceptSecondsLeft } from "../src/features/queue/clock/acceptSecondsLeft.ts";

// Told at 50_000 on the client's clock that 10 s are left to accept.
const proposal = { acceptWithinMs: 10_000, receivedAt: 50_000 };

test("the time left to accept starts from what the server said was left", () => {
  expect(acceptSecondsLeft(proposal, 50_000)).toBe(10);
});

test("the time left to accept shrinks with the client's clock, a second showing until it is fully spent", () => {
  expect(acceptSecondsLeft(proposal, 50_001)).toBe(10);
  expect(acceptSecondsLeft(proposal, 51_000)).toBe(9);
  expect(acceptSecondsLeft(proposal, 59_001)).toBe(1);
  expect(acceptSecondsLeft(proposal, 60_000)).toBe(0);
});

test("the time left to accept is never negative", () => {
  expect(acceptSecondsLeft(proposal, 75_000)).toBe(0);
});

test("a proposal heard late starts from the time that was left when it was sent", () => {
  expect(acceptSecondsLeft({ acceptWithinMs: 7400, receivedAt: 0 }, 400)).toBe(7);
});
