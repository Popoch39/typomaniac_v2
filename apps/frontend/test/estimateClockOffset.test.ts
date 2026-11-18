import { expect, test } from "bun:test";
import { estimateClockOffset } from "../src/features/duel/clock/estimateClockOffset.ts";

test("the offset is the server instant minus the middle of the round trip", () => {
  expect(estimateClockOffset([{ sentAt: 1000, serverAt: 5050, receivedAt: 1100 }])).toBe(4000);
});

test("the offset can be negative when the client clock is ahead of the server's", () => {
  expect(estimateClockOffset([{ sentAt: 9000, serverAt: 7010, receivedAt: 9020 }])).toBe(-2000);
});

test("the sample with the shortest round trip wins, since its middle is the closest to the pong", () => {
  const samples = [
    { sentAt: 1000, serverAt: 5350, receivedAt: 1400 },
    { sentAt: 2000, serverAt: 6015, receivedAt: 2020 },
    { sentAt: 3000, serverAt: 7000, receivedAt: 3300 },
  ];

  expect(estimateClockOffset(samples)).toBe(4005);
});

test("without any sample there is no estimate", () => {
  expect(estimateClockOffset([])).toBeNull();
});
