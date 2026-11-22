import { expect, test } from "bun:test";
import {
  isAdministrator,
  type SignedInPlayer,
  sessionOf,
} from "../src/features/auth/session/sessionOf.ts";

const lumen = {
  id: "player-1",
  nickname: "Lumen",
  avatarUrl: null,
  ornament: null,
  isAdministrator: false,
} satisfies SignedInPlayer;

test("the session is being checked until the read of the Player first comes back", () => {
  expect(sessionOf(undefined)).toEqual({ kind: "checking" });
});

test("a read that came back with no Player is a Guest, not a session still being checked", () => {
  expect(sessionOf(null)).toEqual({ kind: "guest" });
});

test("a Player without a Nickname is told apart from one with a Nickname", () => {
  const nameless = { ...lumen, nickname: null };
  expect(sessionOf(nameless)).toEqual({ kind: "player", player: nameless });
});

test("a Player with a Nickname is named, and says whether they are the administrator", () => {
  expect(sessionOf(lumen)).toEqual({ kind: "named", player: lumen, isAdministrator: false });
  expect(sessionOf({ ...lumen, isAdministrator: true })).toMatchObject({
    kind: "named",
    isAdministrator: true,
  });
});

test("only a named administrator is let into the administration", () => {
  expect(isAdministrator(sessionOf({ ...lumen, isAdministrator: true }))).toBe(true);
  expect(isAdministrator(sessionOf(lumen))).toBe(false);
  expect(isAdministrator(sessionOf({ ...lumen, nickname: null, isAdministrator: true }))).toBe(
    false,
  );
  expect(isAdministrator(sessionOf(null))).toBe(false);
  expect(isAdministrator(sessionOf(undefined))).toBe(false);
});
