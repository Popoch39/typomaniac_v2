import { expect, test } from "bun:test";
import { roundList } from "../src/features/duel/round/roundList.ts";

const pips = [
  { number: 1, state: "won", label: "Round 1 won by kaelen" },
  { number: 2, state: "lost", label: "Round 2 won by vexwyrm" },
  { number: 3, state: "upcoming", label: "Round 3 not played" },
] as const;

test("each finished Round is listed with its pip and both Points, the Participant's own first", () => {
  const rounds = [
    { number: 1, sides: [{ points: 931 }, { points: 857 }] },
    { number: 2, sides: [{ points: 812 }, { points: 905 }] },
  ];

  expect(roundList(rounds, pips)).toEqual([
    { number: 1, state: "won", label: "Round 1 won by kaelen", points: "931 – 857" },
    { number: 2, state: "lost", label: "Round 2 won by vexwyrm", points: "812 – 905" },
  ]);
});

test("Rounds not played yet are not listed", () => {
  expect(roundList([], pips)).toEqual([]);
});
