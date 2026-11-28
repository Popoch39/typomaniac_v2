import { expect, test } from "bun:test";
import {
  PAIRING_ACCEPT_GUARD_MS,
  acceptsPairing,
} from "../src/features/queue/accept/acceptsPairing.ts";

const enter = { key: "Enter", repeat: false };
const before = PAIRING_ACCEPT_GUARD_MS - 1;
const after = PAIRING_ACCEPT_GUARD_MS + 1;

test("the guard delay is about 400 ms", () => {
  expect(PAIRING_ACCEPT_GUARD_MS).toBe(400);
});

test("Enter pressed before the guard delay does not accept", () => {
  expect(acceptsPairing(enter, 0)).toBe(false);
  expect(acceptsPairing(enter, before)).toBe(false);
});

test("Enter pressed once the guard delay is over accepts", () => {
  expect(acceptsPairing(enter, PAIRING_ACCEPT_GUARD_MS)).toBe(true);
  expect(acceptsPairing(enter, after)).toBe(true);
});

test("an Enter held down since before the prompt never accepts, even past the delay", () => {
  expect(acceptsPairing({ key: "Enter", repeat: true }, after)).toBe(false);
});

test("letters never accept, before or after the delay", () => {
  for (const key of ["a", "Z", "é"]) {
    expect(acceptsPairing({ key, repeat: false }, before)).toBe(false);
    expect(acceptsPairing({ key, repeat: false }, after)).toBe(false);
  }
});

test("the Separator never accepts, before or after the delay", () => {
  expect(acceptsPairing({ key: " ", repeat: false }, before)).toBe(false);
  expect(acceptsPairing({ key: " ", repeat: false }, after)).toBe(false);
});

test("other keys never accept, before or after the delay", () => {
  for (const key of ["Tab", "Escape", "Backspace", "Shift", "ArrowDown"]) {
    expect(acceptsPairing({ key, repeat: false }, before)).toBe(false);
    expect(acceptsPairing({ key, repeat: false }, after)).toBe(false);
  }
});
