import { expect, test } from "bun:test";
import { VIOLATION_CLOSE_REASON } from "@repo/duel-engine";
import { disconnectionMessage } from "../src/features/duel/disconnection/disconnectionMessage.ts";

test("a Participant closed for a Violation is told their input is not accepted and that ranked needs a physical keyboard", () => {
  const message = disconnectionMessage(VIOLATION_CLOSE_REASON);
  expect(message).toContain("an input the game does not accept");
  expect(message).toContain("physical keyboard");
});

test("any other closing is a lost connection", () => {
  expect(disconnectionMessage("")).toBe("The connection to the Duel was lost.");
  expect(disconnectionMessage("message rate exceeded")).toBe(
    "The connection to the Duel was lost.",
  );
});
