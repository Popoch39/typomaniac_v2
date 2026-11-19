import { expect, test } from "bun:test";
import { duelTitle } from "../src/features/duel/round/duelTitle.ts";

test("a Duel won 2–0 is won from the winner's seat and lost from the other", () => {
  const rounds = [
    ["win", "loss"],
    ["win", "loss"],
  ] as const;

  expect(duelTitle(rounds, 0)).toBe("Duel won");
  expect(duelTitle(rounds, 1)).toBe("Duel lost");
});

test("a Duel whose three Rounds leave the score level is drawn from both seats", () => {
  const rounds = [
    ["win", "loss"],
    ["loss", "win"],
    ["draw", "draw"],
  ] as const;

  expect(duelTitle(rounds, 0)).toBe("Duel drawn");
  expect(duelTitle(rounds, 1)).toBe("Duel drawn");
});

test("a Duel still undecided after its Rounds so far has no title yet", () => {
  expect(duelTitle([["win", "loss"]], 0)).toBeNull();
});
