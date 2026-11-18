import { expect, test } from "bun:test";
import { DEFAULT_RANKED_CONFIG, applyDuel } from "../src/index.ts";

test("MMR-3: K is the Placement K-factor up to the last Placement Duel", () => {
  expect(applyDuel({ mmr: 1200, duelsPlayed: 4, rank: null }, 1200, "win")).toEqual({
    // 4 Duels played, fewer than 5: 64 × (1 − 0.5) = 32
    standing: { mmr: 1232, duelsPlayed: 5, rank: null },
    mmrDelta: 32,
    lpDelta: 0,
    rankChange: "none",
  });
});

test("MMR-3: K is the regular K-factor once the Placement Duels have been played", () => {
  // Until the Placement gives a Rank, a Player past Placement stays Unranked.
  expect(applyDuel({ mmr: 1200, duelsPlayed: 5, rank: null }, 1200, "win")).toEqual({
    // 5 Duels played, not fewer than 5: 32 × (1 − 0.5) = 16
    standing: { mmr: 1216, duelsPlayed: 6, rank: null },
    mmrDelta: 16,
    lpDelta: 0,
    rankChange: "none",
  });
});

test("MMR-3: the K-factors and the Placement length come from the configuration given", () => {
  const config = { ...DEFAULT_RANKED_CONFIG, kFactor: 20, placementKFactor: 40, placementDuels: 3 };

  expect(applyDuel({ mmr: 1200, duelsPlayed: 2, rank: null }, 1200, "loss", config)).toEqual({
    // 2 Duels played, fewer than 3: 40 × (0 − 0.5) = −20
    standing: { mmr: 1180, duelsPlayed: 3, rank: null },
    mmrDelta: -20,
    lpDelta: 0,
    rankChange: "none",
  });
  expect(applyDuel({ mmr: 1200, duelsPlayed: 3, rank: null }, 1200, "loss", config)).toEqual({
    // 3 Duels played, not fewer than 3: 20 × (0 − 0.5) = −10
    standing: { mmr: 1190, duelsPlayed: 4, rank: null },
    mmrDelta: -10,
    lpDelta: 0,
    rankChange: "none",
  });
});
