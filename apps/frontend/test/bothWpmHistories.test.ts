import { expect, test } from "bun:test";
import { applyEvent, createGame, type Game, type GameEvent } from "@repo/typing-engine";
import { bothWpmHistories } from "../src/features/duel/chart/bothWpmHistories.ts";

const play = (...events: GameEvent[]): Game =>
  events.reduce(applyEvent, createGame({ mode: "time", seconds: 30 }, ["cat", "dog", "fox"]));

const started = (at: number): GameEvent => ({ type: "start", at });
const typed = (at: number, text: string): GameEvent => ({ type: "insert", at, text });

test("the Opponent's history is empty before their Game has reached the Participant", () => {
  expect(bothWpmHistories(play(started(0)), null, 2000)).toEqual([[0, 0], []]);
});

test("the Opponent's history is read as long after their Start as the Participant's own", () => {
  // The Opponent's Game runs on their own clock, which here reads 5000 at the shared Start.
  const opponent = play(started(5000), typed(5500, "cat dog "));

  // 8 characters by the first second: 8 / 5 / (1 / 60) = 96, then 48.
  expect(bothWpmHistories(play(started(0)), opponent, 2000)).toEqual([
    [0, 0],
    [96, 48],
  ]);
});
