import { expect, test } from "bun:test";
import { EdenFetchError } from "@elysia/eden";
import { accountAgeRefusalOf } from "../src/features/queue/refusal/accountAgeRefusalOf.ts";

test("a Player whose account is too young is told from when ranked opens, and that Practice and Custom Duels stay open", () => {
  const refusal = new EdenFetchError(403, {
    code: "ACCOUNT_TOO_YOUNG",
    opensAt: Date.UTC(2026, 10, 27, 9, 30),
  });

  expect(accountAgeRefusalOf(refusal, "UTC")).toBe(
    "Ranked opens for you on 27 November 2026 at 09:30, once your GitHub or Discord account is 7 days old. Practice and Custom Duels are open meanwhile.",
  );
});

test("a Player whose account age is not recorded is asked to sign in again", () => {
  const refusal = new EdenFetchError(403, { code: "ACCOUNT_AGE_UNKNOWN" });

  expect(accountAgeRefusalOf(refusal)).toBe(
    "Sign out and sign in again to play ranked, so the age of your GitHub or Discord account can be read. Practice and Custom Duels are open meanwhile.",
  );
});

test("nothing to say about the account age when the Queue is refused for another reason", () => {
  expect(accountAgeRefusalOf(null)).toBeNull();
  expect(accountAgeRefusalOf(new EdenFetchError(403, { code: "NICKNAME_REQUIRED" }))).toBeNull();
  expect(accountAgeRefusalOf(new EdenFetchError(403, { code: "ACCOUNT_TOO_YOUNG" }))).toBeNull();
  expect(accountAgeRefusalOf(new Error("Failed to fetch"))).toBeNull();
});
