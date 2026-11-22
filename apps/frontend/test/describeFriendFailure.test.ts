import { expect, test } from "bun:test";
import { EdenFetchError } from "@elysia/eden";
import { describeFriendFailure } from "../src/features/friends/request/describeFriendFailure.ts";

const failure = (status: number, code: string) =>
  describeFriendFailure(new EdenFetchError(status, { code }));

test("each refusal of a Friend request is told in a sentence", () => {
  expect(failure(409, "ALREADY_FRIENDS")).toBe("You are already Friends.");
  expect(failure(409, "REQUEST_PENDING")).toBe("Your Friend request is already waiting.");
  expect(failure(422, "SELF")).toBe("You cannot add yourself as a Friend.");
  expect(failure(404, "PLAYER_NOT_FOUND")).toBe("This Player can no longer be added.");
  expect(failure(409, "FRIEND_LIMIT")).toBe(
    "One of you already has 200 Friends, the most allowed.",
  );
  expect(failure(409, "PENDING_LIMIT")).toBe(
    "You have 50 Friend requests waiting, the most allowed. Cancel one to send another.",
  );
});

test("a request or a Friend already gone is told so", () => {
  expect(failure(404, "REQUEST_NOT_FOUND")).toBe("This Friend request is no longer waiting.");
  expect(failure(404, "FRIEND_NOT_FOUND")).toBe("You are no longer Friends.");
});

test("anything else falls back to the general wording", () => {
  expect(failure(429, "RATE_LIMITED")).toBe("Too many attempts. Wait a moment and try again.");
});
