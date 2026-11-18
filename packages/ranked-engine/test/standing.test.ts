import { expect, test } from "bun:test";
import { DEFAULT_RANKED_CONFIG, createStanding } from "../src/index.ts";

test("createStanding: a new Player starts at the initial MMR, with no Duel played and no Rank", () => {
  expect(createStanding()).toEqual({ mmr: 1200, duelsPlayed: 0, rank: null });
});

test("createStanding: a new Player starts at the initial MMR of the configuration given", () => {
  expect(createStanding({ ...DEFAULT_RANKED_CONFIG, initialMmr: 1500 })).toEqual({
    mmr: 1500,
    duelsPlayed: 0,
    rank: null,
  });
});
