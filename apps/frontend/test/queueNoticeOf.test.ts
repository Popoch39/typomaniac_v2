import { expect, test } from "bun:test";
import { queueNoticeOf } from "../src/features/queue/notice/queueNoticeOf.ts";

test("a removal is announced as a status, with its reason in words", () => {
  expect(queueNoticeOf({ kind: "removed", reason: "notAccepted" })).toEqual({
    role: "status",
    message:
      "You did not accept the Duel in time and left the Queue. Enter it again when you are ready.",
  });
  expect(queueNoticeOf({ kind: "removed", reason: "replaced" })).toEqual({
    role: "status",
    message: "The Queue continues in another tab. Enter it here to take your place back.",
  });
  expect(queueNoticeOf({ kind: "removed", reason: "challenged" })).toEqual({
    role: "status",
    message: "You accepted a Challenge and left the Queue for its Duel.",
  });
});

test("a lost connection is announced as an alert", () => {
  expect(queueNoticeOf({ kind: "disconnected" })).toEqual({
    role: "alert",
    message: "The connection was lost and you left the Queue. Enter it again to keep looking.",
  });
});

test("a refusal is announced as an alert, in the words it was given", () => {
  expect(queueNoticeOf({ kind: "refused", refusal: "Sign in to enter the Queue." })).toEqual({
    role: "alert",
    message: "Sign in to enter the Queue.",
  });
});
