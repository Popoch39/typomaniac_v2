import { expect, test } from "bun:test";
import { applyDuel, createStanding, type Standing } from "../src/index.ts";

test("PURE-1: applying a Duel never modifies the standing it receives", () => {
  const standing: Standing = { mmr: 1300, duelsPlayed: 2, rank: null };
  const untouched = structuredClone(standing);

  applyDuel(standing, 1200, "win");
  applyDuel(standing, 1400, "loss");

  expect(standing).toEqual(untouched);
});

test("PURE-1: the same standing, opponent MMR and Outcome always give the same update", () => {
  const standing: Standing = { mmr: 1300, duelsPlayed: 2, rank: null };

  expect(applyDuel(standing, 1250, "draw")).toEqual(
    applyDuel(structuredClone(standing), 1250, "draw"),
  );
});

test("PURE-1: the standing and the update pass through JSON unchanged", () => {
  const standing = createStanding();
  // Expected 1 / (1 + 10^(1800 / 400)) = 0.0000316: 64 × (0 − 0.0000316) = −0.002, rounded to 0.
  const update = applyDuel(standing, 3000, "loss");

  expect(JSON.parse(JSON.stringify(standing))).toEqual(standing);
  expect(JSON.parse(JSON.stringify(update))).toEqual(update);
  expect(update).toEqual({
    standing: { mmr: 1200, duelsPlayed: 1, rank: null },
    mmrDelta: 0,
    lpDelta: 0,
    rankChange: "none",
  });
});
