import { expect, test } from "bun:test";
import { progressFilterTag } from "../src/features/progress/filter/progressFilterTag.ts";

test("every Duel of a period is tagged by its period alone", () => {
  expect(progressFilterTag({ window: "20-duels", kind: "all" })).toBe("Last 20 Duels");
  expect(progressFilterTag({ window: "30-days", kind: "all" })).toBe("Last 30 days");
  expect(progressFilterTag({ window: "all", kind: "all" })).toBe("All Duels");
});

test("only ranked or only Custom Duels are tagged by their kind before the period", () => {
  expect(progressFilterTag({ window: "20-duels", kind: "ranked" })).toBe("Ranked · Last 20 Duels");
  expect(progressFilterTag({ window: "30-days", kind: "custom" })).toBe("Custom · Last 30 days");
  expect(progressFilterTag({ window: "all", kind: "ranked" })).toBe("Ranked · All Duels");
});
