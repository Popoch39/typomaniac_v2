import { expect, test } from "bun:test";
import { lead } from "../src/features/duel/points/lead.ts";

test("the Participant with more Points holds the Lead, by the difference", () => {
  expect(lead(979, 884)).toEqual({ holder: "self", points: 95 });
});

test("the Opponent holds the Lead when they have more Points", () => {
  expect(lead(857, 931)).toEqual({ holder: "opponent", points: 74 });
});

test("nobody leads on equal Points", () => {
  expect(lead(500, 500)).toBeNull();
});

test("nobody leads before anyone has scored", () => {
  expect(lead(0, 0)).toBeNull();
});
