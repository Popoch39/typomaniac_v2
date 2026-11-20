import { expect, test } from "bun:test";
import { signalRows } from "../src/features/admin/review/signalRows.ts";

test("each signal of a Game is shown with its name, a readable label and its value", () => {
  expect(
    signalRows([
      { name: "keyPressEvenness", value: 0.9 },
      { name: "superhumanSpeed", value: 0 },
    ]),
  ).toEqual([
    { name: "keyPressEvenness", label: "Even intervals between KeyPresses", value: "0.90" },
    { name: "superhumanSpeed", label: "Speed beyond any person's", value: "0.00" },
  ]);
});

test("a signal the page does not know yet is shown under its name", () => {
  expect(signalRows([{ name: "newSignal", value: 0.456 }])).toEqual([
    { name: "newSignal", label: "newSignal", value: "0.46" },
  ]);
});

test("a Game the fair-play pass has not read yet shows no signal", () => {
  expect(signalRows(null)).toEqual([]);
});
