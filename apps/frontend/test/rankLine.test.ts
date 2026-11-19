import { expect, test } from "bun:test";
import { rankLine } from "../src/features/duel/rank/rankLine.ts";

const ranks = [
  { tier: "gold", division: 2, lp: 62 },
  { tier: "master", lp: 120 },
] as const;

test("in a ranked Duel, each side shows the Rank of its own seat with its LP", () => {
  expect(rankLine(ranks, 0, true)).toBe("Gold II · 62 LP");
  expect(rankLine(ranks, 1, true)).toBe("Master · 120 LP");
});

test("in a ranked Duel, a Player without a Rank is shown as Unranked", () => {
  const withUnranked = [{ tier: "silver", division: 4, lp: 0 }, null] as const;

  expect(rankLine(withUnranked, 1, true)).toBe("Unranked");
  expect(rankLine(withUnranked, 0, true)).toBe("Silver IV · 0 LP");
});

test("a Custom Duel shows no Rank line", () => {
  expect(rankLine(null, 0, true)).toBeNull();
  expect(rankLine(null, 1, true)).toBeNull();
});

test("a disconnected Participant is shown as Disconnected in place of their Rank", () => {
  expect(rankLine(ranks, 0, false)).toBe("Disconnected");
  expect(rankLine([null, null], 1, false)).toBe("Disconnected");
});

test("a disconnected Participant of a Custom Duel is shown as Disconnected too", () => {
  expect(rankLine(null, 1, false)).toBe("Disconnected");
});
