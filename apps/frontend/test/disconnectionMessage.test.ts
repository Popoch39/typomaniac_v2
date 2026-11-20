import { expect, test } from "bun:test";
import { VIOLATION_CLOSE_REASON } from "@repo/duel-engine";
import { disconnectionMessage } from "../src/features/duel/disconnection/disconnectionMessage.ts";

test("a Participant closed for a Violation is told their input is not accepted and that ranked needs a physical keyboard", () => {
  const message = disconnectionMessage(VIOLATION_CLOSE_REASON);
  expect(message).toContain("an input the game does not accept");
  expect(message).toContain("physical keyboard");
});

test("any other closing is a lost connection, to get back into by the link", () => {
  expect(disconnectionMessage("")).toBe(
    "The connection to the Duel was lost. Reopen the link to get back in.",
  );
  expect(disconnectionMessage("message rate exceeded")).toBe(
    "The connection to the Duel was lost. Reopen the link to get back in.",
  );
});
