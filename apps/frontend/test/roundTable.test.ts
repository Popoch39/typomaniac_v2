import { expect, test } from "bun:test";
import { applyEvent, createGame, getResult } from "@repo/typing-engine";
import { roundTable } from "../src/features/duel/round/roundTable.ts";

const idle = getResult(
  applyEvent(
    applyEvent(createGame({ mode: "time", seconds: 1 }, ["cat"]), { type: "start", at: 0 }),
    { type: "tick", at: 1000 },
  ),
);
const resultOf = (wpm: number, accuracy: number, consistency: number) => ({
  ...idle,
  wpm,
  accuracy,
  consistency,
  history: { ...idle.history, wpm: [wpm - 10, wpm] },
});

test("the table compares WPM, Accuracy and Consistency, the Participant's own first, rounded", () => {
  expect(roundTable(resultOf(103.6, 97.2, 81.5), resultOf(98, 94.8, 77))).toEqual([
    { label: "WPM", values: ["104", "98"] },
    { label: "Accuracy", values: ["97%", "95%"] },
    { label: "Consistency", values: ["82%", "77%"] },
  ]);
});
