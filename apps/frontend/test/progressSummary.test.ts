import { expect, test } from "bun:test";
import {
  peakTierLine,
  progressSummaryLines,
  winRate,
} from "../src/features/progress/summary/progressSummary.ts";

test("the win rate is the Duels won over every Duel played, draws included", () => {
  expect(winRate({ won: 3, lost: 1, drawn: 0 })).toBe(0.75);
  expect(winRate({ won: 1, lost: 1, drawn: 2 })).toBe(0.25);
  expect(winRate({ won: 0, lost: 4, drawn: 1 })).toBe(0);
});

test("without any Duel played there is no win rate", () => {
  expect(winRate({ won: 0, lost: 0, drawn: 0 })).toBeNull();
});

test("the summary lines give the Duels won, lost and drawn, then the win rate in whole percents", () => {
  expect(progressSummaryLines({ won: 2, lost: 1, drawn: 0 })).toEqual([
    { label: "Won", value: "2" },
    { label: "Lost", value: "1" },
    { label: "Drawn", value: "0" },
    { label: "Win rate", value: "67%" },
  ]);
});

test("a period where every Duel was won reads 100%", () => {
  expect(progressSummaryLines({ won: 20, lost: 0, drawn: 0 }).at(-1)).toEqual({
    label: "Win rate",
    value: "100%",
  });
});

test("without any Duel played, the summary keeps every line, the win rate shown as a dash", () => {
  expect(progressSummaryLines({ won: 0, lost: 0, drawn: 0 })).toEqual([
    { label: "Won", value: "0" },
    { label: "Lost", value: "0" },
    { label: "Drawn", value: "0" },
    { label: "Win rate", value: "–" },
  ]);
});

test("the Peak Tier reads as its Tier's name", () => {
  expect(peakTierLine("gold")).toBe("Gold");
  expect(peakTierLine("master")).toBe("Master");
});

test("a Player who never reached a Tier is told they have none yet", () => {
  expect(peakTierLine(null)).toBe("No Tier yet");
});
