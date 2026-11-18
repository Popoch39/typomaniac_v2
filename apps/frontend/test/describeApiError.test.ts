import { expect, test } from "bun:test";
import { EdenFetchError } from "@elysia/eden";
import { describeApiError } from "../src/shared/api/describeApiError.ts";

test("a server code is told in words", () => {
  expect(describeApiError(new EdenFetchError(404, { code: "DUEL_NOT_FOUND" }))).toBe(
    "This Duel does not exist or has expired. Ask for a new link.",
  );
});

test("the caller can word a server code for its own action", () => {
  const byCode = { NICKNAME_REQUIRED: "Choose a Nickname to create a Duel." };
  expect(describeApiError(new EdenFetchError(403, { code: "NICKNAME_REQUIRED" }), byCode)).toBe(
    "Choose a Nickname to create a Duel.",
  );
});

test("a server that cannot be reached asks to check the connection", () => {
  // Eden reports a fetch that never got a response as a 503 carrying the thrown error.
  const unreachable = new EdenFetchError(503, new TypeError("Failed to fetch"));
  expect(describeApiError(unreachable)).toBe(
    "The server could not be reached. Check your connection and try again.",
  );
});

test("a server failure never shows its status", () => {
  const message = describeApiError(new EdenFetchError(500, "Internal Server Error"));
  expect(message).toBe("Something went wrong on our side. Try again in a moment.");
});

test("an unknown server code falls back to its status", () => {
  expect(describeApiError(new EdenFetchError(401, { code: "SOMETHING_NEW" }))).toBe(
    "Sign in to continue.",
  );
});

test("anything else thrown gets a generic message", () => {
  expect(describeApiError(new SyntaxError("Unexpected token < in JSON"))).toBe(
    "Something went wrong. Try again.",
  );
  expect(describeApiError(new EdenFetchError(418, null))).toBe("Something went wrong. Try again.");
});
