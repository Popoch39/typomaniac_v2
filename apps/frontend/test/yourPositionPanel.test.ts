import { expect, test } from "bun:test";
import { yourPositionPanel } from "../src/features/leaderboard/own/yourPositionPanel.ts";

const lumen = { position: 37, rank: { tier: "platinum", division: 2, lp: 64 } } as const;

test("a ranked Player below Master climbs toward the next Division", () => {
  expect(yourPositionPanel(lumen, true)).toEqual({
    kind: "ranked",
    own: lumen,
    name: "Platinum II",
    progress: { lp: 64, next: "Platinum I" },
  });
});

test("a Diamond I Player climbs toward Master", () => {
  const own = { position: 4, rank: { tier: "diamond", division: 1, lp: 91 } } as const;
  expect(yourPositionPanel(own, true)).toMatchObject({ progress: { lp: 91, next: "Master" } });
});

test("a Master Player has their LP and no climb", () => {
  const own = { position: 1, rank: { tier: "master", lp: 1107 } } as const;
  expect(yourPositionPanel(own, true)).toEqual({
    kind: "ranked",
    own,
    name: "Master",
    progress: null,
  });
});

test("a signed-in Unranked Player is told about their Placement, a Guest gets nothing", () => {
  expect(yourPositionPanel(null, true)).toEqual({ kind: "unranked" });
  expect(yourPositionPanel(null, false)).toEqual({ kind: "guest" });
});
