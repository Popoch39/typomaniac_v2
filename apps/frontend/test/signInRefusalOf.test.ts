import { expect, test } from "bun:test";
import { readSignInSearch, signInRefusalOf } from "../src/features/auth/refusal/signInRefusalOf.ts";

test("a sign-in refused as banned gives the appeal address the API sent with it", () => {
  const search = readSignInSearch({
    error: "BANNED",
    error_description: "appeal@typomaniac.test",
  });

  expect(signInRefusalOf(search)).toEqual({
    kind: "banned",
    appealAddress: "appeal@typomaniac.test",
  });
});

test("any other refused sign-in gives the reason the provider or the API sent", () => {
  const search = readSignInSearch({
    error: "email_not_verified",
    error_description: "Verify your email address with the provider, then sign in again.",
  });

  expect(signInRefusalOf(search)).toEqual({
    kind: "refused",
    reason: "Verify your email address with the provider, then sign in again.",
  });
});

test("a refused sign-in without a reason is still told as one", () => {
  expect(signInRefusalOf(readSignInSearch({ error: "state_not_found" }))).toEqual({
    kind: "refused",
    reason: "Signing in failed. Try again.",
  });
});

test("the sign-in page reached without an error, or with a malformed one, shows no refusal", () => {
  expect(signInRefusalOf(readSignInSearch({}))).toBeNull();
  expect(signInRefusalOf(readSignInSearch({ error: 42, error_description: ["x"] }))).toBeNull();
});
