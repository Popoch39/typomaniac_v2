import { expect, test } from "bun:test";
import { applyEvent, createGame, type Game, type GameEvent } from "@repo/typing-engine";
import { bothWpmHistories } from "../src/features/duel/chart/bothWpmHistories.ts";

const play = (...events: GameEvent[]): Game =>
  events.reduce(applyEvent, createGame({ mode: "time", seconds: 30 }, ["cat", "dog", "fox"]));

const started = (at: number): GameEvent => ({ type: "start", at });
const typed = (at: number, text: string): GameEvent => ({ type: "insert", at, text });

test("the Opponent's history is empty before their Game has reached the Participant", () => {
  expect(bothWpmHistories(play(started(0)), null, 2000).histories).toEqual([[0, 0], []]);
});

test("the Opponent's history is read as long after their Start as the Participant's own", () => {
  // The Opponent's Game runs on their own clock, which here reads 5000 at the shared Start.
  const opponent = play(started(5000), typed(5500, "cat dog "));

  // 8 characters by the first second: 8 / 5 / (1 / 60) = 96, then 48.
  expect(bothWpmHistories(play(started(0)), opponent, 2000).histories).toEqual([
    [0, 0],
    [96, 48],
  ]);
});

test("each side's live head is its WPM at the reading instant, between two seconds", () => {
  // The Opponent's Game runs on their own clock, which here reads 5000 at the shared Start.
  const self = play(started(0), typed(400, "cat "));
  const opponent = play(started(5000), typed(5500, "cat dog "));

  // 4 then 8 characters in 1.5 seconds: 32 and 64 WPM, both read 1.5 seconds after the Start.
  expect(bothWpmHistories(self, opponent, 1500).heads).toEqual([
    { seconds: 1.5, wpm: 32 },
    { seconds: 1.5, wpm: 64 },
  ]);
});

test("there is no live head before the Game has started", () => {
  expect(bothWpmHistories(play(), null, 1500).heads).toEqual([null, null]);
});

test("an Opponent whose Game has not started has no live head", () => {
  expect(bothWpmHistories(play(started(0), typed(400, "cat ")), play(), 1500).heads).toEqual([
    { seconds: 1.5, wpm: 32 },
    null,
  ]);
});

test("a side that has started but typed nothing yet has no live head", () => {
  const opponent = play(started(5000), typed(5500, "cat dog "));

  expect(bothWpmHistories(play(started(0)), opponent, 1500).heads).toEqual([
    null,
    { seconds: 1.5, wpm: 64 },
  ]);
});
