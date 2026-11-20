import { expect, test } from "bun:test";
import {
  describeVoidedDuel,
  voidedDuelAppeal,
} from "../src/features/fair-play/notice/describeVoidedDuel.ts";

const voided = {
  duelId: "d1",
  voidedAt: 0,
  opponentNickname: "ada",
  opponentBanned: false,
  appealAddress: null,
};

test("the Opponent of the Player at fault is told the Duel was voided and the LP they got back", () => {
  expect(describeVoidedDuel({ ...voided, lp: 17 })).toBe(
    "Your ranked Duel against ada was voided: you got 17 LP back.",
  );
});

test("the Player at fault is told the Duel was voided and the LP taken back", () => {
  expect(describeVoidedDuel({ ...voided, lp: -30 })).toBe(
    "Your ranked Duel against ada was voided: 30 LP were taken back.",
  );
});

test("a voiding that moved no LP, such as during Placement, says so", () => {
  expect(describeVoidedDuel({ ...voided, lp: 0 })).toBe(
    "Your ranked Duel against ada was voided: your LP did not change.",
  );
});

test("an Opponent without a Nickname is named as an Opponent", () => {
  expect(describeVoidedDuel({ ...voided, opponentNickname: null, lp: 1 })).toBe(
    "Your ranked Duel against an Opponent was voided: you got 1 LP back.",
  );
});

test("an Opponent banned since is marked as banned", () => {
  expect(describeVoidedDuel({ ...voided, opponentBanned: true, lp: 17 })).toBe(
    "Your ranked Duel against ada, since banned, was voided: you got 17 LP back.",
  );
});

test("the Player at fault is given the address to contest a Duel voided against them", () => {
  expect(voidedDuelAppeal({ ...voided, lp: -30, appealAddress: "appeal@example.org" })).toEqual({
    appealAddress: "appeal@example.org",
    appealLink: "mailto:appeal@example.org",
  });
});

test("the Opponent repaired by a voiding is given no address to contest it", () => {
  expect(voidedDuelAppeal({ ...voided, lp: 17 })).toBeNull();
});
