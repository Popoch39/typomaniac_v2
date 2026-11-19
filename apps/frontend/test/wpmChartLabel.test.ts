import { expect, test } from "bun:test";
import { wpmChartLabel } from "../src/features/duel/chart/wpmChartLabel.ts";

test("a WPM chart is labelled with its Round and both WPMs, the Participant's own first", () => {
  expect(
    wpmChartLabel(2, [
      { name: "kaelen", wpm: 104 },
      { name: "vexwyrm", wpm: 98 },
    ]),
  ).toBe("WPM over Round 2: kaelen 104, vexwyrm 98");
});

test("the WPMs are said as whole numbers", () => {
  expect(
    wpmChartLabel(1, [
      { name: "kaelen", wpm: 103.6 },
      { name: "vexwyrm", wpm: 97.2 },
    ]),
  ).toBe("WPM over Round 1: kaelen 104, vexwyrm 97");
});
