import { expect, test } from "bun:test";
import {
  peakTierLine,
  progressSummaryLines,
  winRate,
  winRateLabel,
} from "../src/features/progress/summary/progressSummary.ts";

test("the win rate is the Duels won over every Duel played, draws included", () => {
  expect(winRate({ won: 3, lost: 1, drawn: 0 })).toBe(0.75);
  expect(winRate({ won: 1, lost: 1, drawn: 2 })).toBe(0.25);
  expect(winRate({ won: 0, lost: 4, drawn: 1 })).toBe(0);
});

test("without any Duel played there is no win rate", () => {
  expect(winRate({ won: 0, lost: 0, drawn: 0 })).toBeNull();
});

test("the win rate reads in whole percents", () => {
  expect(winRateLabel({ won: 2, lost: 1, drawn: 0 })).toBe("67%");
  expect(winRateLabel({ won: 20, lost: 0, drawn: 0 })).toBe("100%");
});

test("without any Duel played, the win rate reads as a dash", () => {
  expect(winRateLabel({ won: 0, lost: 0, drawn: 0 })).toBe("–");
});

test("the summary lines give the Duels won, lost and drawn, in that order", () => {
  expect(progressSummaryLines({ won: 2, lost: 1, drawn: 0 })).toEqual([
    { outcome: "won", label: "Won", count: 2 },
    { outcome: "lost", label: "Lost", count: 1 },
    { outcome: "drawn", label: "Drawn", count: 0 },
  ]);
});

test("without any Duel played, the summary keeps every line", () => {
  expect(progressSummaryLines({ won: 0, lost: 0, drawn: 0 }).map((line) => line.count)).toEqual([
    0, 0, 0,
  ]);
});

test("the Peak Tier reads as its Tier's name", () => {
  expect(peakTierLine("gold")).toBe("Gold");
  expect(peakTierLine("master")).toBe("Master");
});

test("a Player who never reached a Tier is told they have none yet", () => {
  expect(peakTierLine(null)).toBe("No Tier yet");
});
