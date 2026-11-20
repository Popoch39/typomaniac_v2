import { expect, test } from "bun:test";
import { describeSuspension } from "../src/features/fair-play/notice/describeSuspension.ts";

const suspension = {
  endsAt: Date.UTC(2026, 10, 23, 12, 30),
  appealAddress: "appeal@typomaniac.test",
};

test("a suspended Player is told until when they are out of the Queue, and what they can still play", () => {
  expect(describeSuspension(suspension, "UTC").summary).toBe(
    "You are suspended from ranked play until Monday 23 November 2026 at 12:30. Practice and Custom Duels stay open.",
  );
});

test("the end of a Suspension is told in the Player's own time zone", () => {
  expect(describeSuspension(suspension, "Europe/Paris").summary).toContain(
    "until Monday 23 November 2026 at 13:30.",
  );
});

test("a suspended Player is given the address to contest their Suspension, and never a reason", () => {
  const described = describeSuspension(suspension, "UTC");
  expect(described.appealAddress).toBe("appeal@typomaniac.test");
  expect(described.appealLink).toBe("mailto:appeal@typomaniac.test");
});
