import { expect, test } from "bun:test";
import { rankChartRows } from "../src/features/progress/rank/rankChartRows.ts";

test("no Rank point draws no point", () => {
  expect(rankChartRows([])).toEqual([]);
});

test("each Rank point is a ranked Duel numbered from 1, at its ladder value, with its Rank and change said", () => {
  expect(
    rankChartRows([
      { endedAt: 1000, ladderIndex: 6, lp: 0, rankChange: "placed" },
      { endedAt: 2000, ladderIndex: 6, lp: 85, rankChange: "none" },
      { endedAt: 3000, ladderIndex: 7, lp: 5, rankChange: "promoted" },
      { endedAt: 4000, ladderIndex: 6, lp: 75, rankChange: "demoted" },
    ]),
  ).toEqual([
    {
      duel: 1,
      endedAt: 1000,
      ladder: 600,
      rankChange: "placed",
      line: "Placed in Silver II, 0 LP",
    },
    { duel: 2, endedAt: 2000, ladder: 685, rankChange: "none", line: "Silver II, 85 LP" },
    {
      duel: 3,
      endedAt: 3000,
      ladder: 705,
      rankChange: "promoted",
      line: "Promoted to Silver I, 5 LP",
    },
    {
      duel: 4,
      endedAt: 4000,
      ladder: 675,
      rankChange: "demoted",
      line: "Demoted to Silver II, 75 LP",
    },
  ]);
});

test("Master is said without a Division", () => {
  expect(
    rankChartRows([{ endedAt: 1000, ladderIndex: 20, lp: 140, rankChange: "none" }])[0]?.line,
  ).toBe("Master, 140 LP");
});
